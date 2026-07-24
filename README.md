# pb-ts-zod

Generate **Zod schemas + TypeScript types** from your **PocketBase** collections — offline from a SQLite file or `pb_schema.json`, or live from a running instance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npx pb-ts-zod --db ./pb_data/data.db --out src/pocketbase-zod.ts
```

That command reads your schema straight out of the database file — **no running server, no superuser password, no native dependencies** — and writes a fully-typed, runtime-validating schema module.

## Why pb-ts-zod

- **🔌 Offline & CI-friendly.** Generate from a `data.db` file or a `pb_schema.json` export. Perfect for CI pipelines, pre-commit hooks, and locked-down environments where you can't (or don't want to) run PocketBase and hand over admin credentials. Uses Node's built-in `node:sqlite` — **zero native modules to compile.**
- **✅ Real validators, not just types.** Emits `min`/`max`/`.regex(...)`/`.int()` from your PocketBase field constraints, `z.enum(...)` for selects, single-vs-multi arrays for select/relation/file, and `geoPoint` objects — so the schemas actually *validate*, not just describe.
- **🎯 Correct for real PocketBase responses.** Handles PB's quirks that trip up naive generators: space-separated datetimes (`2022-01-01 10:00:00.123Z`), the `""` empty sentinel on optional `email`/`url`/`select` fields, hidden `password`/`tokenKey` fields, and the v0.23+ `_superusers` auth model.
- **🆕 Zod 4 by default, Zod 3 on request.** Modern `z.email()` / `z.url()` output out of the box; pass `--zod 3` for legacy projects.
- **🧩 Record vs Response.** A `*RecordSchema` for what you create/update and a `*ResponseSchema` (with `id`, `created`, `updated`, `collectionId`, …) for what the API returns — plus typed `CollectionRecords` / `CollectionResponses` registries.

## Requirements

- **Node.js ≥ 22.5** (for the built-in `node:sqlite` reader).
- **PocketBase v0.23+** for the modern schema shape; older exports are read via a legacy fallback.
- **Zod** installed in your project (`zod@^3.20 || ^4`) — it's a peer dependency of the *generated* code, not of this tool.

## Usage

### Offline — from the SQLite database (recommended)

```bash
npx pb-ts-zod --db ./pb_data/data.db --out src/pocketbase-zod.ts
```

### Offline — from a schema export

Dashboard → **Settings → Export collections** gives you a `pb_schema.json`:

```bash
npx pb-ts-zod --json ./pb_schema.json --out src/pocketbase-zod.ts
```

### Live — from a running instance

```bash
# with superuser email + password
npx pb-ts-zod --url http://127.0.0.1:8090 --email admin@example.com --password secret

# or with a pre-obtained superuser token
npx pb-ts-zod --url http://127.0.0.1:8090 --token "$PB_TOKEN"
```

### From environment / a `.env` file

```env
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=secret
# or: PB_TYPEGEN_TOKEN=...
```

```bash
npx pb-ts-zod --env                 # read from process env / ./.env
npx pb-ts-zod --env ./config/.env   # read from a specific file
```

## CLI options

| Flag | Description |
| --- | --- |
| `-d, --db <path>` | PocketBase SQLite database file (offline) |
| `-j, --json <path>` | `pb_schema.json` export (offline) |
| `-u, --url <url>` | URL of a running instance |
| `--email` / `-p, --password` | Superuser credentials (with `--url`) |
| `-t, --token <token>` | Superuser auth token (with `--url`) |
| `--env [path]` | Read config from env or a `.env` file |
| `-o, --out <path>` | Output file, or directory when `--split` is set |
| `--zod <3\|4>` | Target Zod major version (default `4`) |
| `--split` | Emit one module per collection instead of a single file |
| `--no-validators` | Emit bare types without min/max/regex/int validators |
| `--include-system` | Include system collections (`_superusers`, …) |

## Programmatic API

```ts
import { fromDatabase, generate } from "pb-ts-zod";

const collections = fromDatabase("./pb_data/data.db");
const [file] = generate(collections, { zod: 4, validators: true });
console.log(file.content);
```

Also exported: `fromJSON`, `fromURL`, `normalizeCollections`, and the high-level `run(options)` /
`generateFiles(options)` orchestrators. Every fetcher returns a normalized `Collection[]` you can
transform before `generate`.

## What it generates

For a `posts` collection you get:

```ts
export const PostsStatusOptions = ["draft", "published", "archived"] as const;

export const PostsRecordSchema = z.object({
  title: z.string().min(3).max(120),
  status: z.enum(PostsStatusOptions),
  tags: z.array(z.enum(PostsTagsOptions)).max(5).optional(),
  author: RecordIdString,
  homepage: z.url().or(z.literal("")).optional(),
  location: GeoPoint.optional(),
  // …
});

export const PostsResponseSchema = PostsRecordSchema.extend({
  id: RecordIdString,
  created: IsoDateString.optional(),
  updated: IsoDateString.optional(),
  collectionId: z.string(),
  collectionName: z.literal("posts"),
  expand: z.record(z.string(), z.unknown()).optional(),
});

export type PostsRecord = z.infer<typeof PostsRecordSchema>;
export type PostsResponse = z.infer<typeof PostsResponseSchema>;
```

Plus a `Collections` enum and `CollectionRecords` / `CollectionResponses` / `Schemas` registries.

## Field mapping

| PocketBase | Zod (required) | Notes |
| --- | --- | --- |
| `text` | `z.string()` | `.min/.max/.regex` from constraints |
| `editor` | `HTMLString` | |
| `number` | `z.number()` | `.int()` when integer-only; `.min/.max` |
| `bool` | `z.boolean()` | |
| `email` / `url` | `z.email()` / `z.url()` | `.or(z.literal(""))` when optional |
| `date` / `autodate` | `IsoDateString` | PB-accurate datetime regex (space or `T`) |
| `select` | `z.enum(...)` or `z.array(z.enum(...))` | array when `maxSelect > 1` |
| `relation` / `file` | `RecordIdString` / `z.string()` | array when `maxSelect > 1` |
| `json` | `z.unknown().nullable()` | |
| `geoPoint` | `GeoPoint` = `{ lon, lat }` | PB v0.27+ |

## Migrating from `pocketbase-zod-generator`

`pb-ts-zod` is the successor to `pocketbase-zod-generator`, rewritten from the ground up. Key differences: Zod 4 output, correct PocketBase v0.23+ superuser auth, a `node:sqlite` reader with no native deps, real validators, and PB-accurate date/empty-value handling. The CLI flags are compatible; the binary is now `pb-ts-zod`.

## Development & testing

```bash
npm run check      # typecheck (tsc 7) + lint (Biome) + unit tests (Vitest)
npm run test:e2e   # full round-trip against a real PocketBase (Bun)
```

Two layers of tests:

- **Unit** (`test/`, Vitest) — field mapping, normalization, emitter output, and a suite that
  compiles the generated Zod 4 source and executes it against sample records.
- **End-to-end** (`test-e2e/`, Bun) — downloads a real PocketBase binary, provisions a fresh
  instance with a comprehensive schema (every field type, base/auth/view, single & multi
  select/relation/file, geoPoint, json, constraints, hidden fields) and seeded data (including file
  uploads and empty-sentinel records), then generates schemas from **all three sources** (live URL,
  `pb_schema.json`, and the SQLite file) and asserts the generated Zod **validates the actual API
  responses** — plus that it rejects malformed data. First run downloads PocketBase (~15 MB, cached
  under `test-e2e/.pb-cache/`); requires Bun and network access.

## License

MIT © Martin Blasko
