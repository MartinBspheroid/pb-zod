# pb-ts-zod — API Reference

The programmatic surface is exactly what `src/index.ts` re-exports. Anything else in `src/`
(`io.ts`, `dialect.ts`, `mapping.ts`, `naming.ts`, `isUniqueSingleColumn`) is internal and may
change without a major bump.

```ts
import {
  generate,
  fromDatabase, fromJSON, fromURL,
  normalizeCollection, normalizeCollections,
  collectFromSource, generateFiles, run,
  DEFAULT_OUT, DEFAULT_OUT_DIR,
} from "pb-ts-zod";
```

The package is ESM-only (`"type": "module"`), Node ≥ 22.5.

---

## Pipeline

```
source ──▶ RawCollection[] ──▶ normalizeCollections ──▶ Collection[] ──▶ generate ──▶ EmitFile[]
(db/json/url)                                        (internal model)              (source text)
```

`run()` wraps the whole chain and writes to disk. `generateFiles()` stops one step short and hands
back the file contents. `generate()` is the pure, synchronous core.

---

## Fetchers

Each fetcher returns an already-normalized `Collection[]` — system collections (`system: true` or a
leading `_`) are dropped unless `includeSystem` is set.

### `fromDatabase`

```ts
function fromDatabase(
  dbPath: string,
  opts?: { includeSystem?: boolean },
): Collection[]
```

**Synchronous.** Opens `pb_data/data.db` read-only via `node:sqlite` and reads
`SELECT * FROM _collections`. Field definitions come from the `fields` column (`schema` before
PB v0.23); the `indexes` column supplies the raw index SQL. No server, no credentials, no native
dependency.

Requires Node ≥ 22.5 for `node:sqlite`. In a bundled build, `node:sqlite` must stay a
`node:`-prefixed external — bundlers that strip the prefix break this import.

### `fromJSON`

```ts
async function fromJSON(
  path: string,
  opts?: { includeSystem?: boolean },
): Promise<Collection[]>
```

Reads a `pb_schema.json` export (Dashboard → Settings → Export collections). Accepts both a bare
array and a `{ "collections": [...] }` wrapper. Throws with the file path on invalid JSON or an
unexpected shape.

### `fromURL`

```ts
interface RemoteAuth {
  token?: string;     // pre-obtained superuser token
  email?: string;     // superuser identity, used with password
  password?: string;
}

async function fromURL(
  url: string,
  auth: RemoteAuth,
  opts?: { includeSystem?: boolean },
): Promise<Collection[]>
```

Lists `/api/collections` from a running instance, paginating at `perPage=200` until `totalPages` is
exhausted. Uses the global `fetch`.

Auth resolution: `auth.token` is used as-is if present; otherwise `email` + `password` are exchanged
for a token; otherwise it throws. Token exchange posts to
`/api/collections/_superusers/auth-with-password` (PB v0.23+), falling back to the legacy
`/api/admins/auth-with-password` only if the modern endpoint fails.

---

## Normalization

### `normalizeCollection`

```ts
function normalizeCollection(raw: RawCollection): Collection
```

Converts one raw PocketBase collection into the internal model. Reads the v0.23+ `fields` array,
falling back to the legacy `schema` array, and flattens each field's type-specific options (the
pre-0.23 nested `options: {}` object is consulted as a per-property fallback).

### `normalizeCollections`

```ts
function normalizeCollections(
  raw: RawCollection[],
  opts?: { includeSystem?: boolean },   // default false
): Collection[]
```

Maps `normalizeCollection` over the array, skips entries without a string `name`, and — unless
`includeSystem` is true — drops any collection with `system: true` or a name starting with `_`.

---

## Generation

### `generate`

```ts
function generate(
  collections: Collection[],
  options?: GenerateOptions,
): EmitFile[]
```

**Synchronous and pure** — no I/O. Collections are sorted by name before emission, so output is
deterministic regardless of input order.

Returns one file in the default mode and `2 + collections.length` files in split mode.

### `GenerateOptions`

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `zod` | `3 \| 4` | `4` | Target Zod major. Selects `z.email()` vs `z.string().email()`, and the `z.record` arity. |
| `validators` | `boolean` | `true` | Emit `.min/.max/.regex/.int` from PocketBase constraints. `false` gives bare types. |
| `split` | `boolean` | `false` | One module per collection instead of a single file. |
| `expand` | `boolean` | `true` | Typed per-relation `expand` keys. **Zod 4 only.** |
| `backRelations` | `boolean` | `true` | Include reverse `{collection}_via_{field}` expand keys. |

`expand` is silently ignored under Zod 3 — the emitter computes
`useExpand = (options.expand ?? true) && zod === 4`, so `{ zod: 3, expand: true }` still emits the
generic `z.record(...)` envelope. `backRelations` only has an effect when `useExpand` is true.

### `EmitFile`

```ts
interface EmitFile {
  name: string;
  content: string;
}
```

In single-file mode the array holds one entry named `pocketbase-zod.ts` (the name is advisory — the
CLI writes to `--out` regardless). In split mode the names are `_shared.ts`, one `<collection>.ts`
per collection, and `index.ts`.

---

## Orchestration

### `RunOptions`

```ts
interface RunOptions extends GenerateOptions {
  db?: string;
  json?: string;
  url?: string;
  email?: string;
  password?: string;
  token?: string;
  env?: boolean | string;      // true, or a path to the .env file
  includeSystem?: boolean;     // default false
  out?: string;                // file (single) or directory (split)
}
```

### `collectFromSource`

```ts
async function collectFromSource(options: RunOptions): Promise<Collection[]>
```

Picks a source by **first match wins**, in this order:

1. `db` → `fromDatabase`
2. `json` → `fromJSON`
3. `url` → `fromURL` with `{ token, email, password }`
4. `env` → resolve config from the environment, then `fromURL`

If none are set it throws `No schema source provided. …`. If `env` is used without a resolvable
`PB_TYPEGEN_URL` it throws `Missing PB_TYPEGEN_URL …`.

Environment resolution reads `PB_TYPEGEN_URL`, `PB_TYPEGEN_EMAIL`, `PB_TYPEGEN_PASSWORD`, and
`PB_TYPEGEN_TOKEN`. Values come from a `.env` file (the path given to `env`, else `./.env`) layered
**under** `process.env` — a real environment variable always wins over the file. A missing or
unreadable `.env` file is not an error.

### `generateFiles`

```ts
async function generateFiles(options: RunOptions): Promise<EmitFile[]>
```

`collectFromSource` + `generate`. Returns the file contents without touching the filesystem.

### `run`

```ts
interface RunResult {
  collections: number;   // how many collections were emitted
  files: string[];       // paths actually written
}

async function run(options: RunOptions): Promise<RunResult>
```

`collectFromSource` + `generate` + write. In single mode `out` is a file path and its parent
directory is created as needed; in split mode `out` is a directory that receives every emitted file.
`out` defaults to `DEFAULT_OUT` (`"pocketbase-zod.ts"`) or, when `split` is set, `DEFAULT_OUT_DIR`
(`"pocketbase-zod"`).

---

## Model types

### `Collection`

```ts
type CollectionType = "base" | "auth" | "view";

interface Collection {
  id: string;              // "" when the source omits it
  name: string;
  type: CollectionType;    // anything unrecognized normalizes to "base"
  system: boolean;
  fields: Field[];
  indexes: string[];       // raw `CREATE INDEX` / `CREATE UNIQUE INDEX` SQL strings
}
```

`indexes` is kept as raw SQL because back-relation cardinality depends on it: a back-relation is
emitted as a single object (not an array) when the source relation field carries a single-column
`CREATE UNIQUE INDEX`.

### `Field`

```ts
type FieldType =
  | "text" | "editor" | "number" | "bool" | "email" | "url"
  | "date" | "autodate" | "select" | "relation" | "file"
  | "json" | "geoPoint" | "password"
  | "user";   // legacy

interface Field {
  id?: string;
  name: string;
  type: FieldType | (string & {});
  required: boolean;
  system: boolean;
  hidden: boolean;
  presentable?: boolean;
  primaryKey?: boolean;
  min?: number | string;
  max?: number | string;
  pattern?: string;
  onlyInt?: boolean;
  maxSelect?: number;
  minSelect?: number;
  values?: string[];
  collectionId?: string;
  autogeneratePattern?: string;
  onlyDomains?: string[];
  exceptDomains?: string[];
}
```

Notes that matter when consuming the model:

- `type` is widened with `(string & {})` — an unknown PocketBase field type survives normalization
  and maps to `z.unknown()` rather than throwing.
- `min` / `max` are `number | string` (date bounds arrive as strings) and must be coerced.
  **A `0` is not uniformly a bound**: PocketBase stores text/id length limits as Go `int`, so `0`
  means *unbounded*; number limits are nullable pointers, so `0` there is a real bound.
- `maxSelect` drives cardinality for `select` / `relation` / `file`: absent or `1` → scalar,
  `> 1` → array.
- `minSelect` exists on **relation fields only**.
- `values` is the `select` option list (may contain duplicates; de-duplicate before emitting).
- `collectionId` on a relation points at the target collection's `id`.
- `autogeneratePattern` on a text field means the server fills it, so it is optional on create.
- `system` fields belong on the Response schema only; `hidden` fields are excluded from both Record
  and Response, since the API never serializes them.
- `onlyDomains` and `exceptDomains` are mutually exclusive in practice.

### Raw types

`RawCollection` and `RawField` mirror what the PB API and the `_collections` table actually contain
— both the modern (`fields`, flattened options) and legacy (`schema`, nested `options`) shapes, with
an index signature for forward compatibility. Use them when hand-building input for
`normalizeCollections`.

---

## Examples

### Generate to a string

```ts
import { fromDatabase, generate } from "pb-ts-zod";

const collections = fromDatabase("./pb_data/data.db"); // sync
const [file] = generate(collections, { zod: 4 });
console.log(file!.content);
```

### Transform collections before generating

```ts
import { fromJSON, generate } from "pb-ts-zod";

const collections = await fromJSON("./pb_schema.json");

// Emit only base collections, and drop a field you never want typed.
const trimmed = collections
  .filter((c) => c.type === "base")
  .map((c) => ({ ...c, fields: c.fields.filter((f) => f.name !== "internal_notes") }));

const [file] = generate(trimmed, { zod: 4, validators: true });
```

### Split mode

```ts
import { fromDatabase, generate } from "pb-ts-zod";

const files = generate(fromDatabase("./pb_data/data.db"), { split: true });
for (const f of files) console.log(f.name); // _shared.ts, posts.ts, users.ts, …, index.ts
```

### From a live instance

```ts
import { fromURL, generate } from "pb-ts-zod";

const collections = await fromURL("http://127.0.0.1:8090", {
  email: "admin@example.com",
  password: "secret",
});
const [file] = generate(collections, { zod: 4, backRelations: false });
```

### End-to-end, writing to disk

```ts
import { run } from "pb-ts-zod";

const { collections, files } = await run({
  db: "./pb_data/data.db",
  out: "src/pocketbase-zod.ts",
  zod: 4,
});
console.log(`${collections} collections → ${files.join(", ")}`);
```
