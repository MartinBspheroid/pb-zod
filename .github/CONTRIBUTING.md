# Contributing to pb-ts-zod

Thanks for your interest in contributing. This document covers the development setup, the checks
your change has to pass, and the conventions the codebase follows.

## Getting started

### Prerequisites

- **Node.js ≥ 22.5** — required for the built-in `node:sqlite` module
- **npm** (the repo uses `package-lock.json`)
- **Bun** and network access — only for the end-to-end suite
- **Git**

### Setup

```bash
git clone https://github.com/MartinBspheroid/pb-zod.git
cd pb-zod
npm install

npm run check          # typecheck + lint + unit tests
npm run dev -- --help  # run the CLI from source
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Bundle with tsdown → `dist/*.mjs` (+ `.d.mts`) |
| `npm run dev` | Run the CLI from source via tsx (`npm run dev -- --db …`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `biome check .` |
| `npm run lint:fix` | `biome check --write .` |
| `npm run format` | `biome format --write .` |
| `npm test` | Unit tests (Vitest, single run) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run check` | **The gate**: typecheck + lint + unit tests |
| `npm run test:e2e` | Build, then the Bun end-to-end suite against a real PocketBase |

## Development workflow

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your change, with tests
3. Run the gate: `npm run check`
4. For anything touching field mapping, emission, or the fetchers, also run `npm run test:e2e`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
6. Push and open a Pull Request

### Commit convention

`feat:` · `fix:` · `docs:` · `style:` · `refactor:` · `test:` · `chore:`

Use `feat!:` or a `BREAKING CHANGE:` footer when the **generated output** changes in a way that
could break consumers — that's the main source of breaking changes in this project.

## Architecture

`src/` is a one-way pipeline:

```
fetchers/{sqlite,json,remote}.ts  →  normalize.ts  →  emit.ts  →  io.ts
                                                       ↑
                                        mapping.ts / naming.ts / dialect.ts
```

| Module | Responsibility |
| --- | --- |
| `types.ts` | internal `Collection` / `Field` model plus the raw PocketBase shapes |
| `normalize.ts` | raw PB → internal model; handles v0.23+ `fields` **and** legacy `schema`/`options` |
| `dialect.ts` | the Zod 3 vs Zod 4 surface differences |
| `mapping.ts` | one field → one Zod expression — **the core logic** |
| `naming.ts` | identifier casing and schema/type naming |
| `emit.ts` | assembles the output file(s); single-file or `--split` |
| `fetchers/` | one module per source, each returning a normalized `Collection[]` |
| `run.ts` / `io.ts` | source selection and write orchestration; env parsing and file writing |
| `cli.ts` / `index.ts` | the commander CLI and the public API |

Deeper reference material lives in [`.claude/ref/`](../.claude/ref/) —
`architecture.md`, `api-reference.md`, `cli-reference.md`, and `field-mapping.md`.

## Correctness invariants

These exist because real PocketBase responses break naive assumptions. Don't regress them:

- **Dates.** `IsoDateString` must accept PocketBase's space-separated datetimes
  (`2022-01-01 10:00:00.123Z`) and `""`. `z.iso.datetime()` rejects both.
- **Empty sentinel.** Optional `email` / `url` / single-`select` fields need `.or(z.literal(""))`.
- **Hidden and system fields.** `hidden` fields are excluded from both Record and Response schemas
  (never serialized). `system` fields belong on the Response schema only.
- **Text `min`/`max` of `0` means unbounded** — it's the Go int zero value. Never emit `.min(0)` or
  `.length(0)` for text or id fields. Number `min`/`max` are nullable pointers, so `0` there is a
  real bound.
- **Typed `expand` uses Zod 4 getters** (`get expand() { return z.object({…}).optional() }`) — the
  only idiom that typechecks for mutually recursive schemas (`z.lazy` does not). Keep `.extend()`;
  the object-spread form evaluates the getter eagerly. Zod-4-only.
- **Superuser auth** is the `_superusers` collection endpoint (v0.23+); `/api/admins/…` is a legacy
  fallback only.
- **`node:sqlite` must stay a `node:`-prefixed external** in the bundle. tsdown handles this;
  esbuild-based bundlers strip the prefix and break the CLI.

## Adding a field type

1. Extend `FieldType` in `src/types.ts`.
2. Add a `case` to `baseExpr` in `src/mapping.ts`.
3. Add the field to `test/fixtures/pb_schema.json` (or `features_schema.json`) and assert on it in
   `test/mapping.test.ts` and `test/generated.test.ts`.
4. If it can appear in a real instance, add it to `test-e2e/fixtures/schema.ts` too.
5. Update the mapping table in `README.md` and `.claude/ref/field-mapping.md`.

## Testing

**Unit tests** (`test/`, Vitest, Node):

- `normalize.test.ts` — modern and legacy PB shapes
- `mapping.test.ts` — one field → the expected Zod expression
- `emit.test.ts` — file assembly, registries, split mode
- `generated.test.ts` / `features.test.ts` — compile the emitted Zod 4 source with esbuild and
  **execute it** against sample records

Compiling and running the output is the important part: a test that only string-matches the emitted
source can pass while producing a schema that rejects real data.

**End-to-end** (`test-e2e/`, Bun): downloads and caches a real PocketBase binary, provisions a fresh
instance with a comprehensive schema and seed data, generates from all three sources, and validates
the output against live API responses.

```bash
npm run test:e2e
```

`test-e2e/` is Bun-only and deliberately outside the tsconfig and Biome scope — it imports generated
`.ts` files natively. The first run downloads PocketBase (~15 MB) into `test-e2e/.pb-cache/`.

## Code style

Biome handles formatting and linting — run `npm run lint:fix` rather than hand-formatting. Comments
should explain *why* (especially the PocketBase quirk a branch exists for), not restate the code.

## Documentation

When your change is user-facing:

- Update `README.md` (flags, field mapping table, examples)
- Add a `CHANGELOG.md` entry under `[Unreleased]`
- Update the relevant file in `.claude/ref/`
- Update `CLAUDE.md` if you change an architectural invariant

## Getting help

- **Issues** — bug reports and feature requests
- **Discussions** — questions and ideas
- **Security** — please report privately to the maintainer rather than opening a public issue

## License

By contributing you agree that your contributions are licensed under the MIT License.
