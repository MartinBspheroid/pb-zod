# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**pb-ts-zod** — a CLI + library that generates Zod schemas and TypeScript types from PocketBase
collections. Reads offline from a SQLite file (`node:sqlite`) or a `pb_schema.json` export, or live
from a running instance. Zod 4 by default, Zod 3 via `--zod 3`.

Formerly published as `pocketbase-zod-generator`; rewritten for v1.0.

## Commands

```bash
npm run build       # tsdown -> dist/*.mjs (+ .d.mts)
npm run dev         # tsx src/cli.ts
npm run typecheck   # tsc --noEmit (TypeScript 7 native)
npm run test        # vitest run  (unit tests)
npm run lint        # biome check .
npm run check       # typecheck + lint + test  (the unit CI gate)
npm run test:e2e    # build + bun test test-e2e/  (real PocketBase round-trip)
```

Node ≥ 22.5 is required (`node:sqlite`). The e2e suite additionally needs Bun and network access
(first run downloads a PocketBase binary into `test-e2e/.pb-cache/`).

## Architecture (`src/`)

- `types.ts` — internal `Collection`/`Field` model + raw PB shapes.
- `normalize.ts` — raw PB → internal model. Handles v0.23+ `fields`/flattened options **and** the
  legacy `schema`/nested `options` fallback; drops system collections by default.
- `dialect.ts` — the Zod v3 vs v4 surface differences (`z.email()` vs `z.string().email()`, etc.).
- `mapping.ts` — one field → a Zod expression, with validators, single/multi arrays, empty-sentinel
  unions, and optional/nullable handling. **The core logic.**
- `emit.ts` — assembles the output file(s): aliases, `Collections` enum, select option consts,
  Record/Response schemas, registries. Single-file or `--split`.
- `fetchers/` — `sqlite.ts` (`node:sqlite`), `json.ts`, `remote.ts` (global `fetch`, `_superusers`
  auth). Each returns a normalized `Collection[]`.
- `run.ts` — source selection + write orchestration. `io.ts` — env/.env parsing + file writing.
- `cli.ts` — commander CLI. `index.ts` — public API.

## Correctness invariants (don't regress these)

- **Dates**: `IsoDateString` must accept PB's space-separated datetimes (`2022-01-01 10:00:00.123Z`)
  and `""` — not `z.iso.datetime()`, which rejects both.
- **Empty sentinel**: optional `email`/`url`/single-`select` need `.or(z.literal(""))`.
- **System fields** come from the schema (`system: true`) and belong on the Response schema only;
  **all `hidden` fields are excluded** from both Record and Response (never serialized).
- **Text min/max of `0` = unbounded** (Go int zero value) — never emit `.length(0)`/`.min(0)` for
  text/id. (Number min/max are nullable pointers, so `0` there is a real bound.)
- **`minSelect` only applies to a *required* relation.** PB enforces it only when the field has a
  value; an optional relation may be empty and the API returns `[]`. Emitting `.min(n)` there makes
  the schema reject real responses.
- **Typed `expand`** uses Zod 4 **getters** (`get expand() { return z.object({…}).optional() }`) —
  the only idiom that typechecks recursively (verified; `z.lazy` fails). Keep `.extend()` (not the
  spread form, which evaluates the getter eagerly). Zod-4-only; `--zod 3`/`--no-expand` → generic
  `z.record`. Back-relation is a single object iff a single-column `CREATE UNIQUE INDEX` exists.
- **Auth**: superuser auth is the `_superusers` collection endpoint (v0.23+); `/api/admins/...` is a
  legacy fallback only.
- **Build**: `node:sqlite` must stay a `node:`-prefixed external in `dist` (tsdown handles this;
  esbuild-based bundlers strip the prefix and break it).

## Tests

**Unit** (`test/`, Vitest, Node): `test/fixtures/pb_schema.json` covers every field type across
base/auth/view collections. `test/generated.test.ts` compiles the emitted Zod 4 source with esbuild
and executes it against sample records.

**E2E** (`test-e2e/`, Bun): spins up a real PocketBase (`helpers/server.ts` — downloads + caches the
binary, superuser upsert, serve, health wait), pushes a comprehensive schema + seed data
(`fixtures/schema.ts`), generates from all three sources, and validates the generated Zod against
live API responses. Bun-only (not in tsconfig/Biome scope); imports the generated `.ts` natively.
Gotcha: PB's `--migrationsDir` is pinned inside the ephemeral data dir so auto-migrations don't leak
across runs.

## Adding a field type

1. Extend `FieldType` in `types.ts`.
2. Add a case in `baseExpr` (`mapping.ts`).
3. Add a field to the fixture and assertions in `mapping.test.ts` / `generated.test.ts`.
