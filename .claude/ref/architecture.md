# Architecture

Internal reference for `pb-ts-zod` — a CLI + library that turns PocketBase collection
definitions into Zod schemas and TypeScript types.

## Module layout

```
src/
├── cli.ts              # commander CLI -> RunOptions -> run()
├── index.ts            # public API surface (re-exports)
├── run.ts              # source selection + orchestration
├── io.ts               # .env parsing, file writing
├── types.ts            # internal Collection/Field model + raw PB shapes
├── normalize.ts        # raw PB (modern or legacy) -> internal model
├── dialect.ts          # the Zod v3 vs v4 surface differences
├── mapping.ts          # one Field -> one Zod expression  (core logic)
├── naming.ts           # identifier/name derivation
├── emit.ts             # assembles the output file(s)
└── fetchers/
    ├── sqlite.ts       # node:sqlite reader (pb_data/data.db)
    ├── json.ts         # pb_schema.json export
    └── remote.ts       # live instance over HTTP
```

Dependency flow is one-way:

```
fetchers/* ──> normalize ──> types
                   │
run / cli ─────────┼──> emit ──> mapping ──> naming
   │               │        └──> dialect
   └──> io         └──> normalize (isUniqueSingleColumn)
```

`emit.ts` never touches I/O or the network; the fetchers never know about Zod. `run.ts` is the
only module that wires a source to the emitter to the filesystem, and `cli.ts` is a thin
argument-parsing shell over it.

## Pipeline

```
RawCollection[]  ──normalizeCollections()──>  Collection[]
                                                   │
                                          generate(collections, options)
                                                   │
                                              EmitFile[]  ──writeFiles()──> disk
```

- `collectFromSource(options)` (`run.ts:28`) picks exactly one of `--db` / `--json` / `--url` /
  `--env` and returns already-normalized `Collection[]`. Every fetcher calls
  `normalizeCollections` itself, so all three sources converge on the same model.
- `generateFiles(options)` stops after `generate` (no disk writes) — that's the hook for
  programmatic consumers.
- `run(options)` does the whole thing and returns `{ collections, files }`.

## Internal model

`Collection` and `Field` (`types.ts:31`, `types.ts:64`) exist because PocketBase v0.23 changed the
wire shape:

| | ≤ v0.22 | v0.23+ |
| --- | --- | --- |
| field array | `schema` | `fields` |
| type-specific options | nested `options: {...}` | flattened onto the field |

`normalize.ts` absorbs both. `prop<T>(raw, key)` (`normalize.ts:6`) reads the flattened key and
falls back to `raw.options[key]`, normalizing `null` to `undefined` so downstream `!== undefined`
checks behave. `normalizeCollection` reads `raw.fields ?? raw.schema ?? []`.

`normalizeCollections` also drops system collections (`c.system` or a leading `_`) unless
`includeSystem` is set.

`Collection.indexes` carries the raw `CREATE INDEX` SQL strings — needed later for back-relation
cardinality.

## Emitter structure

`generate()` (`emit.ts:232`) sorts collections by name (stable output) and assembles blocks:

1. `HEADER` — `@generated` banner.
2. `IMPORTS` — `import { z } from "zod";`
3. `aliasBlock()` — `RecordIdString`, `IsoDateString`, `HTMLString`, `GeoPoint`.
4. `collectionsEnum()` — `export enum Collections`.
5. `selectOptionsBlock()` — every select field's `as const` values array, emitted once globally so
   any schema can reference it.
6. One `collectionSchemas()` block per collection.
7. `registryBlock()` — `CollectionRecords`, `CollectionResponses`, and the runtime `Schemas` map.

### Single-file vs `--split`

Default: all blocks joined into one `pocketbase-zod.ts`.

`--split` emits:

- `_shared.ts` — header, imports, aliases, `Collections`, select options.
- `<collection>.ts` — one per collection, importing aliases/option consts from `./_shared.js` and
  **value** imports of each expand target's Response schema.
- `index.ts` — `export *` of everything plus the registry block.

The cross-file expand imports are genuinely circular (`posts.ts` imports `authors.ts` and vice
versa). That is safe: the `expand` member is a **getter**, so the referenced schema is only read
when the getter runs — long after all modules have finished evaluating. `expandRefs()`
(`emit.ts:212`) computes exactly which targets a collection needs and excludes self-references.

## Record vs Response

`collectionSchemas()` (`emit.ts:139`) splits a collection's fields:

- `recordFields` = `!f.system && !f.hidden` → the `*RecordSchema` (what you create/update).
- `systemFields` = `f.system && !f.hidden` → appended to the `*ResponseSchema` only.
- **Hidden fields are excluded from both** — the API never serializes them.

The Response schema is `RecordSchema.extend({ ...systemFields, collectionId, collectionName, expand })`.
`.extend()` is required here, not the `z.object({ ...Record.shape, ... })` spread form — a spread
evaluates the `expand` getter eagerly and breaks the recursion.

`isCreateOptional()` (`emit.ts:81`) marks the primary key and any text field with an
`autogeneratePattern` as `.optional()` in the Record schema even when `required`, because the
server fills them in.

## Typed expand

`buildExpandGetter()` (`emit.ts:102`) emits:

```ts
get expand() {
  return z
    .object({
      author: AuthorsResponseSchema.optional(),                  // single forward relation
      reviewers: z.array(AuthorsResponseSchema).optional(),      // maxSelect > 1
      posts_via_author: z.array(PostsResponseSchema).optional(), // back-relation
      profiles_via_author: ProfilesResponseSchema.optional(),    // uniquely indexed -> single
    })
    .optional();
}
```

Supporting pieces:

- `buildIndices()` (`emit.ts:195`) builds `byId` (collection id → collection) and `backIndex`
  (target collection id → list of `{ src, field }` relations pointing at it). Both are computed
  once over the emitted set, so a relation to a filtered-out collection degrades to
  `z.unknown().optional()`.
- Forward relations win over a same-named back-relation key (`seen` set).
- `isUniqueSingleColumn(indexes, fieldName)` (`normalize.ts:59`) decides back-relation cardinality:
  PocketBase resolves the reverse side as a single object rather than an array when the source
  relation field carries a single-column `CREATE UNIQUE INDEX`.

**Why getters.** Recursive/circular schemas need deferred evaluation, and the Zod 4 getter idiom is
the only one that typechecks — `z.lazy()` loses the inferred type across the cycle. This is
Zod-4-only; `useExpand` is `(options.expand ?? true) && zod === 4` (`emit.ts:239`), so `--zod 3` and
`--no-expand` both fall back to the generic `dialect.record` envelope.

## Zod 3/4 dialect seam

`dialect.ts` is the single place that knows about version differences:

| | Zod 3 | Zod 4 |
| --- | --- | --- |
| `email` | `z.string().email()` | `z.email()` |
| `url` | `z.string().url()` | `z.url()` |
| `record` | `z.record(z.unknown())` | `z.record(z.string(), z.unknown())` |

Deliberately **not** in the dialect: the date schema. PocketBase serializes datetimes as
`2022-01-01 10:00:00.123Z` (space, not `T`) and returns `""` for unset dates — both rejected by
`z.iso.datetime()` and `z.string().datetime()` alike. `ISO_DATE_ALIAS` (`emit.ts:26`) is a
hand-written regex that is identical on both versions.

## Extension points

**Adding a field type**

1. Add it to `FieldType` in `types.ts:12`.
2. Add a `case` to `baseExpr()` in `mapping.ts:77` (unknown types already fall through to
   `z.unknown()`).
3. If it needs a new option, add it to `Field`/`RawField` and to `normalizeField()` via `prop()`.
4. Extend `test/fixtures/pb_schema.json` and assert in `mapping.test.ts` / `generated.test.ts`.

**Adding a fetcher**

Drop a module in `src/fetchers/` that returns `Promise<Collection[]>` (or `Collection[]`) by calling
`normalizeCollections(raw, opts)`, then wire it into `collectFromSource()` and the CLI options.

## Tests

- `test/` — Vitest on Node. Unit coverage of normalize, mapping, and emit, plus
  `generated.test.ts` / `features.test.ts`, which compile the emitted source with esbuild and
  execute the resulting Zod schemas against sample records.
- `test-e2e/` — Bun. Downloads and runs a real PocketBase, provisions a schema, generates from all
  three sources, and validates the output against live API responses. It is **outside** the
  `tsconfig.json` and Biome scopes (Bun-specific APIs, native `.ts` imports), so `npm run typecheck`
  and `npm run lint` do not cover it.
