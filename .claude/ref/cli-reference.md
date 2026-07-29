# pb-ts-zod — CLI Reference

Generate Zod schemas + TypeScript types from PocketBase collections. Reads offline from a SQLite
file or a `pb_schema.json` export, or live from a running instance.

Package: `pb-ts-zod` · Binary: `pb-ts-zod` · Requires **Node >= 22.5** (for `node:sqlite`).

## Invocation

```bash
# one-off, no install
npx pb-ts-zod --db ./pb_data/data.db

# as a devDependency (recommended)
npm install -D pb-ts-zod
npx pb-ts-zod --db ./pb_data/data.db -o src/pocketbase-zod.ts

# global
npm install -g pb-ts-zod
pb-ts-zod --help
```

As an npm script:

```json
{
  "scripts": {
    "typegen": "pb-ts-zod --db ./pb_data/data.db -o src/pocketbase-zod.ts"
  }
}
```

## Options

| Flag | Argument | Default | Description |
| --- | --- | --- | --- |
| `-d, --db` | `<path>` | — | PocketBase SQLite file (`pb_data/data.db`). Offline. |
| `-j, --json` | `<path>` | — | `pb_schema.json` export file. Offline. |
| `-u, --url` | `<url>` | — | URL of a running PocketBase instance. |
| `--email` | `<email>` | — | Superuser email (with `--url`). |
| `-p, --password` | `<password>` | — | Superuser password (with `--url`). |
| `-t, --token` | `<token>` | — | Superuser auth token (with `--url`). |
| `--env` | `[path]` | — | Read config from env / a `.env` file. |
| `-o, --out` | `<path>` | see below | Output file, or directory when `--split`. |
| `--zod` | `<version>` | `4` | Zod major to target: `3` or `4`. |
| `--split` | — | `false` | One module per collection instead of one file. |
| `--no-validators` | — | validators on | Skip `min`/`max`/`regex`/`int` validators. |
| `--no-expand` | — | expand on | Generic `z.record` `expand` instead of typed keys. |
| `--no-back-relations` | — | back-relations on | Omit `{coll}_via_{field}` expand keys. |
| `--include-system` | — | `false` | Include system collections (`_superusers`, …). |
| `-V, --version` | — | — | Print the package version. |
| `-h, --help` | — | — | Print usage. |

## Source selection

Exactly one source is used. `collectFromSource` checks in a fixed order and the **first match
wins** — later flags are ignored, not merged:

```
--db  →  --json  →  --url  →  --env
```

If none is given the command fails with:

```
✗ No schema source provided. Use one of --db <file>, --json <file>, --url <url>, or --env.
```

### `--db <path>` — SQLite (offline)

Reads the `_collections` table directly via `node:sqlite`, read-only. No server, no credentials,
no native modules.

```bash
pb-ts-zod --db ./pb_data/data.db -o src/pocketbase-zod.ts
```

### `--json <path>` — schema export (offline)

Reads a `pb_schema.json` produced by Dashboard → Settings → Export collections.

```bash
pb-ts-zod --json ./pb_schema.json -o src/pocketbase-zod.ts
```

### `--url <url>` — live instance

Lists collections over the REST API. Requires superuser credentials: either `--token`, or
`--email` + `--password` (which are exchanged for a token against the `_superusers` collection).

```bash
# email + password
pb-ts-zod --url http://127.0.0.1:8090 --email admin@example.com -p secret123

# pre-obtained token
pb-ts-zod --url http://127.0.0.1:8090 -t "$PB_TOKEN"
```

Providing `--url` with neither a token nor an email/password pair fails with
`✗ Provide either an auth token or an email + password.`

### `--env [path]` — env vars / `.env` file

```bash
pb-ts-zod --env               # reads ./.env, layered under process.env
pb-ts-zod --env ./ci/.env     # reads that file instead
```

| Variable | Purpose |
| --- | --- |
| `PB_TYPEGEN_URL` | Instance URL. **Required** for this mode. |
| `PB_TYPEGEN_TOKEN` | Superuser token. |
| `PB_TYPEGEN_EMAIL` | Superuser email. |
| `PB_TYPEGEN_PASSWORD` | Superuser password. |

Real environment variables take precedence over values in the file. Missing `PB_TYPEGEN_URL`
fails with `✗ Missing PB_TYPEGEN_URL (set it in your environment or .env file).`

## Output

| Mode | Default `--out` | Written |
| --- | --- | --- |
| single (default) | `pocketbase-zod.ts` | one file |
| `--split` | `pocketbase-zod/` | a directory |

Parent directories are created as needed.

`--split` writes:

```
pocketbase-zod/
├── _shared.ts        # alias schemas, Collections enum, select option consts
├── <collection>.ts   # one per collection: Record/Response schemas + types
└── index.ts          # re-exports everything + the registries
```

Per-collection modules import their expand targets from each other. Circular imports are safe —
the typed `expand` is emitted as a getter, so access is deferred until every module has loaded.

## Generation flags

- **`--zod <3|4>`** — target Zod major. Default `4`. Any value other than `3` or `4` prints
  `Invalid --zod value "<x>". Use 3 or 4.` and exits `1`.
- **`--no-validators`** — emit bare types with no `.min()`/`.max()`/`.regex()`/`.int()` derived
  from PocketBase constraints.
- **`--no-expand`** — emit `expand: z.record(...).optional()` instead of typed per-relation keys.
  **Implied by `--zod 3`**: typed expand relies on Zod 4 recursive getters, so a Zod 3 target
  always falls back to the generic record envelope regardless of this flag.
- **`--no-back-relations`** — keep typed forward relations but drop the reverse
  `{collection}_via_{field}` keys.
- **`--include-system`** — keep PocketBase's own collections (`_superusers`, `_authOrigins`,
  `_mfas`, …), which are otherwise filtered out.

## Exit codes and output

| Code | Meaning |
| --- | --- |
| `0` | Files generated and written. |
| `1` | Invalid `--zod` value, or any error thrown while fetching/generating/writing. |

Success (note: **stderr**, not stdout):

```
✓ Generated Zod 4 schemas for 7 collection(s) → src/pocketbase-zod.ts
```

In `--split` mode the target is a count instead of a path:

```
✓ Generated Zod 4 schemas for 7 collection(s) → 9 files
```

Failure:

```
✗ <message>
```

Because the success line goes to stderr, `pb-ts-zod ... | tee log` will not capture it; use
`2>&1` if you need it in a pipeline. Nothing is ever written to stdout.

## Recipes

**CI / pre-commit regeneration from a checked-in database**

```bash
npx pb-ts-zod --db ./pb_data/data.db -o src/pocketbase-zod.ts
git diff --exit-code src/pocketbase-zod.ts   # fail if the committed types are stale
```

**Live instance with a token from CI secrets**

```bash
npx pb-ts-zod --url "$PB_URL" -t "$PB_TOKEN" -o src/pocketbase-zod.ts
```

**Regenerate on install**

```json
{
  "scripts": {
    "prepare": "pb-ts-zod --db ./pb_data/data.db -o src/pocketbase-zod.ts"
  }
}
```

**Split output for a large schema, Zod 3 target**

```bash
npx pb-ts-zod --db ./pb_data/data.db --split --zod 3 -o src/pb
```

## Troubleshooting

**`Cannot find module 'node:sqlite'`** — Node is older than 22.5. Upgrade Node, or use `--json`
with an exported `pb_schema.json`, or `--url` against a running instance.

**Reading `data.db` while PocketBase is running** — recent writes may still sit in the
`data.db-wal` journal, so a read-only open can miss schema changes or fail outright. Stop the
server first (it checkpoints the WAL on shutdown), copy the whole `pb_data` directory including
`data.db-wal`/`data.db-shm`, or switch to `--url`/`--json`.

**`✗ Authentication failed (400). Check the URL and superuser email/password.`** — on PocketBase
v0.23+ superusers are records of the `_superusers` collection; the old `/api/admins/*` endpoint
is only tried as a legacy fallback. Confirm the account exists as a superuser, and that `--url`
points at the API root (no trailing path).

**`✗ Failed to list collections (401 …)`** — the token is missing, expired, or belongs to a
regular user. Listing collections requires superuser scope.

**Zero or unexpectedly few collections** — system collections are filtered out by default. Pass
`--include-system` if you actually want `_superusers` and friends emitted.

**Typed `expand` missing from the output** — check for `--no-expand`, and note that `--zod 3`
disables it unconditionally.
