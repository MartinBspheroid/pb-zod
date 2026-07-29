import { describe, expect, it } from "vitest";
import { dialect } from "../src/dialect.js";
import { type MapContext, zodForField } from "../src/mapping.js";
import type { Field } from "../src/types.js";

function field(partial: Partial<Field> & Pick<Field, "name" | "type">): Field {
  return { required: true, system: false, hidden: false, ...partial };
}

const ctx4: MapContext = { collectionName: "posts", dialect: dialect(4), validators: true };
const ctx3: MapContext = { collectionName: "posts", dialect: dialect(3), validators: true };
const noValidators: MapContext = { ...ctx4, validators: false };

describe("zodForField — Zod 4 idioms", () => {
  it("emits top-level string formats", () => {
    expect(zodForField(field({ name: "e", type: "email" }), ctx4)).toBe("z.email()");
    expect(zodForField(field({ name: "u", type: "url" }), ctx4)).toBe("z.url()");
    expect(zodForField(field({ name: "d", type: "date" }), ctx4)).toBe("IsoDateString");
  });

  it("maps a default primary key to the record-id alias", () => {
    const id = field({
      name: "id",
      type: "text",
      primaryKey: true,
      min: 15,
      max: 15,
      pattern: "^[a-z0-9]+$",
    });
    expect(zodForField(id, ctx4)).toBe("RecordIdString");
    // a view's pattern-only id also uses the alias
    const viewId = field({ name: "id", type: "text", primaryKey: true, pattern: "^[a-z0-9]+$" });
    expect(zodForField(viewId, ctx4)).toBe("RecordIdString");
  });

  it("emits explicit constraints for a customized primary key", () => {
    const custom = field({
      name: "id",
      type: "text",
      primaryKey: true,
      min: 20,
      max: 20,
      pattern: "^u_[a-z0-9]+$",
    });
    expect(zodForField(custom, ctx4)).toBe(
      'z.string().length(20).regex(new RegExp("^u_[a-z0-9]+$"))',
    );
  });

  it("relation minSelect emits .min() on a required array", () => {
    const f = field({ name: "editors", type: "relation", maxSelect: 5, minSelect: 2 });
    expect(zodForField(f, ctx4)).toBe("z.array(RecordIdString).min(2).max(5)");
  });

  it("relation minSelect is dropped on an optional array", () => {
    // PocketBase lets an optional relation be empty and returns `[]` for it,
    // so a `.min()` floor would reject a real API response.
    const f = field({
      name: "editors",
      type: "relation",
      required: false,
      maxSelect: 5,
      minSelect: 2,
    });
    expect(zodForField(f, ctx4)).toBe("z.array(RecordIdString).max(5).optional()");
  });

  it("email onlyDomains emits a domain refine", () => {
    const f = field({ name: "e", type: "email", onlyDomains: ["Example.com"] });
    expect(zodForField(f, ctx4)).toBe(
      'z.email().refine((v) => ["example.com"].includes(v.slice(v.lastIndexOf("@") + 1).toLowerCase()))',
    );
  });

  it("url exceptDomains emits a negated hostname refine, then empty-union when optional", () => {
    const f = field({ name: "u", type: "url", required: false, exceptDomains: ["bad.example"] });
    expect(zodForField(f, ctx4)).toBe(
      'z.url().refine((v) => { try { return !["bad.example"].includes(new URL(v).hostname.toLowerCase()); } catch { return false; } }).or(z.literal("")).optional()',
    );
  });

  it("applies text validators", () => {
    const f = field({ name: "title", type: "text", min: 3, max: 120, pattern: "^[a-z]+$" });
    expect(zodForField(f, ctx4)).toBe('z.string().min(3).max(120).regex(new RegExp("^[a-z]+$"))');
  });

  it("applies number validators including int", () => {
    const f = field({ name: "n", type: "number", onlyInt: true, min: 0, max: 5 });
    expect(zodForField(f, ctx4)).toBe("z.number().int().min(0).max(5)");
  });

  it("omits validators when disabled", () => {
    const f = field({ name: "title", type: "text", min: 3, max: 120, pattern: "^x$" });
    expect(zodForField(f, noValidators)).toBe("z.string()");
  });

  it("single vs multi select", () => {
    const single = field({ name: "status", type: "select", maxSelect: 1, values: ["a", "b"] });
    const multi = field({ name: "tags", type: "select", maxSelect: 5, values: ["a", "b"] });
    expect(zodForField(single, ctx4)).toBe("z.enum(PostsStatusOptions)");
    expect(zodForField(multi, ctx4)).toBe("z.array(z.enum(PostsTagsOptions)).max(5)");
  });

  it("select with no values degrades to string", () => {
    const f = field({ name: "s", type: "select", maxSelect: 1, values: [] });
    expect(zodForField(f, ctx4)).toBe("z.string()");
  });

  it("relation single vs multi uses the id alias", () => {
    const single = field({ name: "author", type: "relation", maxSelect: 1 });
    const multi = field({ name: "editors", type: "relation", maxSelect: 10 });
    expect(zodForField(single, ctx4)).toBe("RecordIdString");
    expect(zodForField(multi, ctx4)).toBe("z.array(RecordIdString).max(10)");
  });

  it("relation with unset maxSelect is single", () => {
    expect(zodForField(field({ name: "a", type: "relation" }), ctx4)).toBe("RecordIdString");
  });

  it("geoPoint maps to the GeoPoint alias", () => {
    expect(zodForField(field({ name: "loc", type: "geoPoint" }), ctx4)).toBe("GeoPoint");
  });

  it("optional & nullable json", () => {
    const f = field({ name: "meta", type: "json", required: false });
    expect(zodForField(f, ctx4)).toBe("z.unknown().nullable().optional()");
  });

  it("optional non-required field gets .optional()", () => {
    const f = field({ name: "body", type: "editor", required: false });
    expect(zodForField(f, ctx4)).toBe("HTMLString.optional()");
  });
});

describe("zodForField — Zod 3 compat", () => {
  it("emits string-method formats", () => {
    expect(zodForField(field({ name: "e", type: "email" }), ctx3)).toBe("z.string().email()");
    expect(zodForField(field({ name: "u", type: "url" }), ctx3)).toBe("z.string().url()");
  });
});
