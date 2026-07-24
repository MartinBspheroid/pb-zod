import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PbClient } from "./helpers/client.js";
import { type PocketBaseHandle, startPocketBase } from "./helpers/server.js";
import { defineSchema, seedData } from "./fixtures/schema.js";

/**
 * Full round-trip: spin up a real PocketBase, push a comprehensive schema + seed
 * data, then generate schemas from all three sources (live URL, JSON export,
 * SQLite file) and prove the generated Zod validates the *actual* API responses.
 */

const TMP = resolve("test-e2e/.tmp");
const CLI = resolve("dist/cli.mjs");
const USER_COLLECTIONS = ["authors", "categories", "posts", "comments", "post_titles"] as const;

let handle: PocketBaseHandle;
let mod: any; // the generated module (imported natively by Bun)
const live: Record<string, any[]> = {};
const generated: Record<"url" | "json" | "db", string> = { url: "", json: "", db: "" };
const genExit: Record<string, number> = {};

function runCli(args: string[], out: string): number {
  const r = Bun.spawnSync(["node", CLI, ...args, "--out", out], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) console.error("CLI failed:", r.stderr.toString());
  return r.exitCode ?? 1;
}

beforeAll(async () => {
  mkdirSync(TMP, { recursive: true });

  // Ensure the CLI is built (fresh) before we shell out to it.
  if (!existsSync(CLI)) {
    const build = Bun.spawnSync(["npm", "run", "build"], { stdout: "ignore", stderr: "pipe" });
    if (build.exitCode !== 0) throw new Error(`build failed: ${build.stderr.toString()}`);
  }

  handle = await startPocketBase();
  const pb = new PbClient(handle.url);
  await pb.authAsSuperuser(handle.superuser.email, handle.superuser.password);

  await defineSchema(pb);
  await seedData(pb);

  // Snapshot the real API responses for every collection.
  for (const name of USER_COLLECTIONS) {
    live[name] = await pb.listRecords(name);
  }

  // Export a pb_schema.json (as the dashboard "Export collections" would).
  const schemaJson = resolve(TMP, "pb_schema.json");
  writeFileSync(schemaJson, JSON.stringify(await pb.listCollections(), null, 2));

  // Generate while the server is live: --url and --json.
  genExit.url = runCli(
    ["--url", handle.url, "--email", handle.superuser.email, "--password", handle.superuser.password],
    resolve(TMP, "gen-url.ts"),
  );
  genExit.json = runCli(["--json", schemaJson], resolve(TMP, "gen-json.ts"));

  // Stop the server (checkpoints the WAL) then generate offline from the DB file.
  await handle.stop();
  genExit.db = runCli(["--db", handle.dbPath], resolve(TMP, "gen-db.ts"));

  generated.url = readFileSync(resolve(TMP, "gen-url.ts"), "utf8");
  generated.json = readFileSync(resolve(TMP, "gen-json.ts"), "utf8");
  generated.db = readFileSync(resolve(TMP, "gen-db.ts"), "utf8");

  // Bun transpiles + imports the generated TS natively.
  mod = await import(resolve(TMP, "gen-url.ts"));
}, 120_000);

afterAll(async () => {
  await handle?.stop();
});

describe("generation across sources", () => {
  test("all three sources generate successfully", () => {
    expect(genExit.url).toBe(0);
    expect(genExit.json).toBe(0);
    expect(genExit.db).toBe(0);
  });

  test("live URL, JSON export, and SQLite file produce identical output", () => {
    expect(generated.json).toBe(generated.url);
    expect(generated.db).toBe(generated.url);
  });

  test("emits typed registries for every user collection", () => {
    expect(mod.Collections).toMatchObject({
      Authors: "authors",
      Categories: "categories",
      Posts: "posts",
      Comments: "comments",
      PostTitles: "post_titles",
    });
    for (const name of USER_COLLECTIONS) expect(mod.Schemas[name]).toBeDefined();
  });

  test("excludes PocketBase system collections", () => {
    expect(generated.url).not.toContain("Superusers");
    expect(generated.url).not.toContain("_authOrigins");
  });
});

describe("generated Zod validates the real API responses", () => {
  test("every seeded record parses against its ResponseSchema", () => {
    let total = 0;
    for (const name of USER_COLLECTIONS) {
      const schema = mod.Schemas[name];
      expect(schema, `schema for ${name}`).toBeDefined();
      for (const record of live[name]) {
        const result = schema.safeParse(record);
        if (!result.success) {
          throw new Error(
            `${name}#${record.id} failed validation:\n${JSON.stringify(result.error.issues, null, 2)}\nrecord: ${JSON.stringify(record)}`,
          );
        }
        total++;
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  test("full post: populated arrays, files, geo, json all validate", () => {
    const post = live.posts.find((p) => p.slug === "hello-world");
    expect(post).toBeDefined();
    const parsed = mod.PostsResponseSchema.parse(post);
    expect(parsed.tags).toEqual(["tech", "news"]);
    expect(parsed.contributors).toHaveLength(2);
    expect(typeof parsed.cover).toBe("string");
    expect(parsed.gallery).toHaveLength(2);
    expect(parsed.geo).toEqual({ lon: 12.34, lat: 45.67 });
    expect(parsed.metadata).toMatchObject({ pinned: true });
  });

  test("minimal post: empty sentinels ('', [], null, {0,0}) validate", () => {
    const post = live.posts.find((p) => p.slug === "minimal");
    expect(post).toBeDefined();
    // sanity-check the fixture actually returned empties
    expect(post.contact_email).toBe("");
    expect(post.homepage).toBe("");
    expect(post.cover).toBe("");
    expect(post.gallery).toEqual([]);
    expect(post.metadata).toBeNull();
    expect(post.publish_date).toBe("");
    expect(mod.PostsResponseSchema.safeParse(post).success).toBe(true);
  });

  test("json-array metadata validates", () => {
    const post = live.posts.find((p) => p.slug === "array-metadata");
    expect(post.metadata).toEqual([1, 2, 3]);
    expect(mod.PostsResponseSchema.safeParse(post).success).toBe(true);
  });

  test("auth (authors) response excludes hidden password/tokenKey", () => {
    const shape = mod.AuthorsResponseSchema.shape;
    expect(shape.email).toBeDefined();
    expect(shape.verified).toBeDefined();
    expect(shape.password).toBeUndefined();
    expect(shape.tokenKey).toBeUndefined();
    for (const author of live.authors) {
      expect(mod.AuthorsResponseSchema.safeParse(author).success).toBe(true);
    }
  });

  test("autodate created/updated are PB space-format datetimes and validate", () => {
    const post = live.posts[0];
    expect(post.created).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    expect(mod.IsoDateString.safeParse(post.created).success).toBe(true);
  });

  test("view collection records validate", () => {
    expect(live.post_titles.length).toBeGreaterThan(0);
    for (const row of live.post_titles) {
      expect(mod.PostTitlesResponseSchema.safeParse(row).success).toBe(true);
    }
  });
});

describe("generated Zod rejects invalid data", () => {
  function validPost() {
    return structuredClone(live.posts.find((p) => p.slug === "hello-world"));
  }

  test("rejects an out-of-range select value", () => {
    expect(mod.PostsResponseSchema.safeParse({ ...validPost(), status: "nope" }).success).toBe(false);
  });

  test("rejects a malformed email", () => {
    expect(mod.PostsResponseSchema.safeParse({ ...validPost(), contact_email: "not-email" }).success).toBe(false);
  });

  test("enforces the text min-length validator", () => {
    expect(mod.PostsResponseSchema.safeParse({ ...validPost(), title: "ab" }).success).toBe(false);
  });

  test("rejects a malformed geoPoint", () => {
    expect(mod.PostsResponseSchema.safeParse({ ...validPost(), geo: { lon: "x", lat: 1 } }).success).toBe(false);
  });
});
