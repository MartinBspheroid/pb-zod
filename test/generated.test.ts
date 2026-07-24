import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generate } from "../src/emit.js";
import { fromJSON } from "../src/fetchers/json.js";

/**
 * The point of this suite: the generated Zod 4 source must actually COMPILE and
 * RUN against real Zod, and validate PocketBase-shaped records — including PB's
 * quirks (space-separated datetimes, `""` empty sentinels).
 */

// dynamically-imported generated module
type GenModule = any;
let mod: GenModule;
const tmpDir = join("test", ".tmp");

beforeAll(async () => {
  const collections = await fromJSON("test/fixtures/pb_schema.json");
  const [file] = generate(collections, { zod: 4 });
  const { code } = await transform(file!.content, {
    loader: "ts",
    format: "esm",
    target: "node22",
  });
  await mkdir(tmpDir, { recursive: true });
  const out = join(tmpDir, "generated.mjs");
  await writeFile(out, code, "utf8");
  mod = await import(pathToFileURL(out).href);
});

afterAll(async () => {
  // leave the file for debugging; .tmp is gitignored
});

const validPost = () => ({
  id: "rec1234567890ab",
  title: "Hello world",
  slug: "hello-world",
  body: "<p>hi</p>",
  views: 42,
  rating: 4,
  published: true,
  status: "published",
  tags: ["tech", "news"],
  author: "usr1234567890ab",
  editors: [],
  cover: "",
  attachments: ["a.png", "b.png"],
  homepage: "",
  contact: "",
  publish_at: "2026-07-24 10:00:00.000Z",
  metadata: null,
  location: { lon: 12.3, lat: 45.6 },
  collectionId: "posts000000001",
  collectionName: "posts",
  created: "2026-07-24 10:00:00.000Z",
  updated: "2026-07-24 10:00:00.000Z",
});

describe("generated Zod 4 output executes", () => {
  it("exposes the expected exports", () => {
    expect(mod.Collections.Posts).toBe("posts");
    expect(mod.PostsStatusOptions).toEqual(["draft", "published", "archived"]);
    expect(mod.Schemas.posts).toBeDefined();
  });

  it("parses a realistic PocketBase response (space datetime, empty sentinels)", () => {
    const parsed = mod.PostsResponseSchema.parse(validPost());
    expect(parsed.title).toBe("Hello world");
    expect(parsed.status).toBe("published");
    expect(parsed.location).toEqual({ lon: 12.3, lat: 45.6 });
  });

  it("accepts empty-string email/url on optional fields", () => {
    const ok = mod.PostsResponseSchema.safeParse({ ...validPost(), contact: "", homepage: "" });
    expect(ok.success).toBe(true);
    const withValues = mod.PostsResponseSchema.safeParse({
      ...validPost(),
      contact: "a@b.com",
      homepage: "https://example.com",
    });
    expect(withValues.success).toBe(true);
  });

  it("rejects an invalid select value", () => {
    const bad = mod.PostsResponseSchema.safeParse({ ...validPost(), status: "nope" });
    expect(bad.success).toBe(false);
  });

  it("rejects an invalid email when one is provided", () => {
    const bad = mod.PostsResponseSchema.safeParse({ ...validPost(), contact: "not-an-email" });
    expect(bad.success).toBe(false);
  });

  it("enforces text length validators", () => {
    const bad = mod.PostsResponseSchema.safeParse({ ...validPost(), title: "hi" }); // min 3
    expect(bad.success).toBe(false);
  });

  it("Record schema omits system fields (title required, id absent)", () => {
    const rec = mod.PostsRecordSchema.safeParse({
      title: "A valid title",
      slug: "a-valid-title",
      status: "draft",
      author: "usr1234567890ab",
    });
    expect(rec.success).toBe(true);
    // id/created are not part of the record (create) schema
    expect(Object.keys(mod.PostsRecordSchema.shape)).not.toContain("id");
    expect(Object.keys(mod.PostsRecordSchema.shape)).not.toContain("created");
  });

  it("auth response exposes email/verified but not password/tokenKey", () => {
    const shape = mod.UsersResponseSchema.shape;
    expect(shape.email).toBeDefined();
    expect(shape.verified).toBeDefined();
    expect(shape.password).toBeUndefined();
    expect(shape.tokenKey).toBeUndefined();
  });
});
