import { describe, expect, it } from "vitest";
import { generate } from "../src/emit.js";
import { fromJSON } from "../src/fetchers/json.js";

async function collections() {
  return fromJSON("test/fixtures/pb_schema.json");
}

describe("generate — single file (Zod 4)", () => {
  it("produces one file with the expected top-level structure", async () => {
    const [file, ...rest] = generate(await collections(), { zod: 4 });
    expect(rest).toHaveLength(0);
    const c = file!.content;

    expect(c).toContain('import { z } from "zod";');
    // PB-accurate date alias (space-separated datetimes + "" sentinel), not z.iso.datetime()
    expect(c).toContain("export const IsoDateString = z.string().regex(");
    expect(c).toContain("export const GeoPoint = z.object({ lon: z.number(), lat: z.number() });");
    // Collections enum
    expect(c).toContain('Posts = "posts",');
    expect(c).toContain('Users = "users",');
    // select option consts
    expect(c).toContain(
      'export const PostsStatusOptions = ["draft","published","archived"] as const;',
    );
    // record vs response
    expect(c).toContain("export const PostsRecordSchema = z.object({");
    expect(c).toContain("export const PostsResponseSchema = PostsRecordSchema.extend({");
    expect(c).toContain('collectionName: z.literal("posts"),');
    // registries
    expect(c).toContain("export type CollectionResponses = {");
    expect(c).toContain("export const Schemas = {");
  });

  it("puts system fields only in the Response schema, not the Record schema", async () => {
    const [file] = generate(await collections(), { zod: 4 });
    const c = file!.content;
    // anchor on the `export const` declarations (schema names also appear inside expand getters)
    const recordBlock = c.slice(
      c.indexOf("export const PostsRecordSchema"),
      c.indexOf("export const PostsResponseSchema"),
    );
    // user field present in record
    expect(recordBlock).toContain("title:");
    // system fields absent from record
    expect(recordBlock).not.toContain("\n  id:");
    expect(recordBlock).not.toContain("created:");
  });

  it("emits typed expand getters: forward (object/array) + back-relation", async () => {
    const [file] = generate(await collections(), { zod: 4 });
    const c = file!.content;
    expect(c).toContain("get expand() {");
    // single relation -> object; multi relation -> array
    expect(c).toContain("author: UsersResponseSchema.optional(),");
    expect(c).toContain("editors: z.array(UsersResponseSchema).optional(),");
    // back-relations onto users (posts.author / posts.editors point here)
    const usersExpand = c.slice(
      c.indexOf("export const UsersResponseSchema"),
      c.indexOf("export type UsersRecord"),
    );
    expect(usersExpand).toContain("posts_via_author: z.array(PostsResponseSchema).optional(),");
    expect(usersExpand).toContain("posts_via_editors: z.array(PostsResponseSchema).optional(),");
  });

  it("--no-expand falls back to the generic record envelope (Zod 4)", async () => {
    const [file] = generate(await collections(), { zod: 4, expand: false });
    const c = file!.content;
    expect(c).not.toContain("get expand() {");
    expect(c).toContain("expand: z.record(z.string(), z.unknown()).optional(),");
  });

  it("--no-back-relations keeps forward keys but drops _via_ keys", async () => {
    const [file] = generate(await collections(), { zod: 4, backRelations: false });
    const c = file!.content;
    expect(c).toContain("author: UsersResponseSchema.optional(),");
    expect(c).not.toContain("_via_");
  });

  it("excludes hidden system fields (password, tokenKey) from auth output", async () => {
    const [file] = generate(await collections(), { zod: 4 });
    const c = file!.content;
    expect(c).not.toContain("password:");
    expect(c).not.toContain("tokenKey:");
    // but exposes the visible auth system fields
    expect(c).toContain("emailVisibility:");
    expect(c).toContain("verified:");
  });

  it("omits the _superusers system collection by default", async () => {
    const [file] = generate(await collections(), { zod: 4 });
    expect(file!.content).not.toContain("Superusers");
  });
});

describe("generate — Zod 3 compat", () => {
  it("emits legacy string-format idioms", async () => {
    const [file] = generate(await collections(), { zod: 3 });
    const c = file!.content;
    expect(c).toContain("z.string().email()");
    expect(c).toContain("z.record(z.unknown())");
    // date alias is PB-accurate and identical across Zod versions
    expect(c).toContain("export const IsoDateString = z.string().regex(");
    // and must NOT use the v4-only top-level formats
    expect(c).not.toContain("z.email()");
  });
});

describe("generate — split mode", () => {
  it("emits _shared, one file per collection, and an index", async () => {
    const files = generate(await collections(), { zod: 4, split: true });
    const names = files.map((f) => f.name).sort();
    expect(names).toContain("_shared.ts");
    expect(names).toContain("posts.ts");
    expect(names).toContain("users.ts");
    expect(names).toContain("index.ts");
    const posts = files.find((f) => f.name === "posts.ts")!;
    expect(posts.content).toContain('from "./_shared.js"');
    // expand getters need cross-file value imports of the referenced Response schemas
    expect(posts.content).toContain('import { UsersResponseSchema } from "./users.js";');
  });
});
