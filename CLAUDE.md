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
npm run test        # vitest run
npm run lint        # biome check .
npm run check       # typecheck + lint + test  (the CI gate)
```

Node ≥ 22.5 is required (`node:sqlite`).

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
  hidden fields (`password`, `tokenKey`) are excluded.
- **Auth**: superuser auth is the `_superusers` collection endpoint (v0.23+); `/api/admins/...` is a
  legacy fallback only.
- **Build**: `node:sqlite` must stay a `node:`-prefixed external in `dist` (tsdown handles this;
  esbuild-based bundlers strip the prefix and break it).

## Tests

`test/fixtures/pb_schema.json` covers every field type across base/auth/view collections.
`test/generated.test.ts` compiles the emitted Zod 4 source with esbuild and executes it against
sample records — the load-bearing test that the output actually works.

## Adding a field type

1. Extend `FieldType` in `types.ts`.
2. Add a case in `baseExpr` (`mapping.ts`).
3. Add a field to the fixture and assertions in `mapping.test.ts` / `generated.test.ts`.
