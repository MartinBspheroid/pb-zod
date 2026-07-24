# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0]

Ground-up rewrite and rename from **`pocketbase-zod-generator`** to **`pb-ts-zod`**.

### Added

- **Zod 4 output by default**, with a `--zod 3` compatibility flag for legacy projects.
- **`node:sqlite` reader** — read collections directly from `pb_data/data.db` with zero native
  dependencies (Node ≥ 22.5). Offline, no server, no credentials.
- **Real validators**: `min`/`max`/`.regex(...)` for text, `.int()`/`min`/`max` for numbers,
  `.max(n)` for multi-value arrays. Opt out with `--no-validators`.
- **`geoPoint` field support** (PocketBase v0.27+) → `{ lon, lat }`.
- **Record vs Response schemas**: system fields (`id`, `created`, `updated`, auth fields) are read
  from the schema and placed only on the `*ResponseSchema`; hidden fields (`password`, `tokenKey`)
  are excluded.
- **Typed registries**: `Collections` enum, `CollectionRecords`, `CollectionResponses`, and a
  runtime `Schemas` map.
- **`--split` mode**: one module per collection plus a shared aliases module and an index.
- A real test suite (Vitest) including tests that execute the generated Zod 4 output against real
  records; Biome lint/format; TypeScript 7 typecheck; tsdown build.

### Changed

- **Correct PocketBase v0.23+ authentication**: superuser auth via the `_superusers` collection
  (the removed `/api/admins/auth-with-password` endpoint is kept only as a legacy fallback).
- **Correct schema model**: reads the v0.23+ `fields` array with flattened options, falling back to
  the legacy `schema`/`options` shape.
- **PB-accurate dates**: `IsoDateString` accepts PocketBase's space-separated datetimes and the `""`
  empty sentinel — where `z.iso.datetime()` would reject real API responses.
- **Empty-value correctness**: optional `email`/`url`/single-`select` fields emit
  `.or(z.literal(""))` to accept PocketBase's empty sentinel.
- Dropped the `cross-fetch`, `form-data`, `sqlite`, and `sqlite3` dependencies (global `fetch` +
  `node:sqlite`). The only runtime dependency is `commander`.

### Migration from `pocketbase-zod-generator`

- Binary renamed to `pb-ts-zod`. CLI flags remain compatible.
- Generated output targets Zod 4 by default — pass `--zod 3` to keep the old idioms.
