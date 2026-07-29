import { describe, expect, it } from "vitest";
import { normalizeCollection, normalizeCollections } from "../src/normalize.js";
import type { RawCollection } from "../src/types.js";

describe("normalizeCollection", () => {
  it("reads the modern v0.23+ `fields` array with flattened props", () => {
    const raw: RawCollection = {
      id: "c1",
      name: "posts",
      type: "base",
      fields: [
        { name: "id", type: "text", system: true, required: true, primaryKey: true },
        { name: "title", type: "text", required: true, min: 3, max: 120 },
        { name: "status", type: "select", maxSelect: 1, values: ["a", "b"] },
      ],
    };
    const c = normalizeCollection(raw);
    expect(c.type).toBe("base");
    expect(c.fields).toHaveLength(3);
    expect(c.fields[1]).toMatchObject({ name: "title", required: true, min: 3, max: 120 });
    expect(c.fields[2]).toMatchObject({ name: "status", maxSelect: 1, values: ["a", "b"] });
  });

  it("falls back to the legacy `schema` array and nested `options`", () => {
    const legacy: RawCollection = {
      id: "c2",
      name: "legacy",
      type: "base",
      schema: [
        {
          name: "role",
          type: "select",
          required: true,
          options: { maxSelect: 2, values: ["x", "y", "z"] },
        },
      ],
    };
    const c = normalizeCollection(legacy);
    expect(c.fields[0]).toMatchObject({ name: "role", maxSelect: 2, values: ["x", "y", "z"] });
  });

  it("defaults an unknown collection type to base", () => {
    const c = normalizeCollection({ name: "x", type: "weird" } as RawCollection);
    expect(c.type).toBe("base");
  });
});

describe("normalizeCollections", () => {
  const raw: RawCollection[] = [
    { name: "posts", type: "base", fields: [] },
    { name: "_superusers", type: "auth", system: true, fields: [] },
    { name: "_authOrigins", type: "base", system: true, fields: [] },
  ];

  it("drops system collections by default", () => {
    const cs = normalizeCollections(raw);
    expect(cs.map((c) => c.name)).toEqual(["posts"]);
  });

  it("keeps system collections when asked", () => {
    const cs = normalizeCollections(raw, { includeSystem: true });
    expect(cs.map((c) => c.name)).toContain("_superusers");
  });
});
