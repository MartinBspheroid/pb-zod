# Field Mapping Reference

How a PocketBase field becomes a Zod expression. The authority is `src/mapping.ts`
(`zodForField` and its helpers); placement into the Record vs Response schema is
`src/emit.ts`; the Zod 3/4 surface differences are `src/dialect.ts`.

## Shared alias schemas

`emit.ts` writes these once at the top of every generated file (in split mode, into
`_shared.ts`). `mapping.ts` refers to them through the `ALIAS` constant, so the emitted
expressions stay readable.

```ts
export const RecordIdString = z.string();
export const IsoDateString = z.string().regex(/^$|^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/);
export const HTMLString = z.string();
export const GeoPoint = z.object({ lon: z.number(), lat: z.number() });
```

### Why `IsoDateString` is a regex

`z.iso.datetime()` (Zod 4) and `z.string().datetime()` (Zod 3) both reject what PocketBase
actually returns:

- PocketBase serializes datetimes with a **space** separator — `2022-01-01 10:00:00.123Z` —
  not the RFC 3339 `T`.
- An unset date field comes back as the **empty string** `""`, not `null` and not absent.

The alias accepts the space form, the `T` form, an optional fractional part, an optional
trailing `Z`, and `""`. It is deliberately **identical across Zod 3 and Zod 4** — it is not
part of the dialect (see `dialect.ts`'s note).

`RecordIdString` and `HTMLString` are plain `z.string()`. They exist for readability and to
give a single place to tighten later; they carry no validation of their own.

## Mapping table

| PocketBase type | Base Zod expression | Notes |
| --- | --- | --- |
| `text` | `z.string()` | `.min`/`.max`/`.regex` when validators on |
| `password` | `z.string()` | same as `text`; almost always `hidden`, so rarely emitted |
| `editor` | `HTMLString` | |
| `number` | `z.number()` | `.int()`, `.min`, `.max` |
| `bool` | `z.boolean()` | |
| `email` | `z.email()` / `z.string().email()` | dialect-dependent; `.refine(...)` for domain lists |
| `url` | `z.url()` / `z.string().url()` | dialect-dependent; `.refine(...)` for domain lists |
| `date` | `IsoDateString` | |
| `autodate` | `IsoDateString` | server-managed (`created`/`updated`) |
| `select` | `z.enum(<Options>)` | `z.array(...)` when `maxSelect > 1`; `z.string()` if no values declared |
| `relation` | `RecordIdString` | `z.array(...)` when `maxSelect > 1` |
| `user` | `RecordIdString` | legacy pre-0.8 alias for `relation`; identical handling |
| `file` | `z.string()` | `z.array(z.string())` when `maxSelect > 1` |
| `json` | `z.unknown()` | the only type that gets `.nullable()` |
| `geoPoint` | `GeoPoint` | PocketBase v0.27+ |
| primary key (`id`) | `RecordIdString` or explicit constraints | see [Primary key](#primary-key-id) |
| anything unrecognized | `z.unknown()` | `default` arm of `baseExpr` |

## The pipeline

`zodForField` composes an expression in a fixed order:

```
baseExpr(field)              →  the value's own schema
  └─ idExpr                  →  when field.primaryKey
  └─ withDomains             →  email / url domain refinement
  └─ arrayOf                 →  select / relation / file when maxSelect > 1
then, only if !field.required:
  .nullable()                →  json only
  .or(z.literal(""))         →  email / url / single select-with-values
  .optional()                →  always, last
```

A **required** field short-circuits: `zodForField` returns `baseExpr` unchanged. Nothing after
that point applies.

```ts
export function zodForField(field: Field, ctx: MapContext): string {
  let expr = baseExpr(field, ctx);
  if (field.required) return expr;
  if (field.type === "json") expr += ".nullable()";
  else if (needsEmptyUnion(field)) expr += '.or(z.literal(""))';
  return `${expr}.optional()`;
}
```

## Per-type detail

### text / password

```ts
let expr = "z.string()";
if (validators) {
  if (min) expr += `.min(${min})`;
  if (max) expr += `.max(${max})`;
  if (field.pattern) expr += `.regex(new RegExp(${JSON.stringify(field.pattern)}))`;
}
```

The `min`/`max` checks are **truthiness** checks, not `!== undefined`. That is intentional:
PocketBase stores text length bounds as Go `int`, so an unset bound is `0`, and `0` means
*unbounded*. Emitting `.min(0)` would be noise; emitting `.length(0)` (as an earlier version
did for view ids) actively rejected valid data.

`pattern` is emitted via `new RegExp("…")` rather than a regex literal so that any characters
in the pattern survive `JSON.stringify` escaping unambiguously.

### editor

`HTMLString` — a `z.string()` alias. PocketBase stores rich text as an HTML string.

### number

```ts
let expr = "z.number()";
if (validators) {
  if (field.onlyInt) expr += ".int()";
  if (min !== undefined) expr += `.min(${min})`;
  if (max !== undefined) expr += `.max(${max})`;
}
```

Note the contrast with text: number bounds use `!== undefined`, because PocketBase models
number `min`/`max` as **nullable pointers**. An unset bound normalizes to `undefined`, so a
literal `0` here is a genuine bound and must be emitted.

### bool

`z.boolean()`. No constraints exist on PocketBase bool fields.

### email / url

The base comes from the dialect (`d.email` / `d.url`), then `withDomains` may append a
refinement. `onlyDomains` is an allow-list, `exceptDomains` a deny-list; PocketBase treats
them as mutually exclusive and `withDomains` prefers `onlyDomains` when both are somehow set.
Domains are lower-cased at generation time and compared lower-cased at runtime.

Email — the domain is everything after the last `@`:

```ts
z.email().refine((v) => ["example.com"].includes(v.slice(v.lastIndexOf("@") + 1).toLowerCase()))
```

URL — parsed with `new URL`, wrapped in `try`/`catch` so an unparseable value fails the
refinement instead of throwing:

```ts
z.url().refine((v) => { try { return ["example.com"].includes(new URL(v).hostname.toLowerCase()); } catch { return false; } })
```

A deny-list emits the same expression with a leading `!` on the `includes(...)` call. Both are
best-effort approximations of PocketBase's server-side check, not exact reimplementations.

### date / autodate

Both map to `IsoDateString`. `autodate` is the v0.23+ type for server-managed `created` /
`updated` fields; it is a distinct type, not a flag on `date`.

### select

```ts
const base = (field.values?.length ?? 0) > 0
  ? `z.enum(${optionsConstName(ctx.collectionName, field.name)})`
  : "z.string()";
return isMulti(field) ? arrayOf(base, field, ctx) : base;
```

The enum references a hoisted `as const` array — `emit.ts` writes
`export const <Collection><Field>Options = [...] as const;` for every select with declared
values, de-duplicated by `uniqueValues`. A select with no declared values cannot become an
enum and degrades to `z.string()`.

### relation / user

Both map to `RecordIdString`, arrayed when multi. `user` is the pre-0.8 field type; it is kept
in `FieldType` and handled identically so ancient schema exports still generate.

### file

`z.string()` (the stored filename), arrayed when multi. Note this is the *record* value — file
URLs are constructed client-side and are not part of the schema.

### json

`z.unknown()`. This is the one PocketBase type that can genuinely hold `null`, so when the
field is optional it gets `.nullable()` (instead of the empty-string union) before `.optional()`.

### geoPoint

`GeoPoint`, i.e. `z.object({ lon: z.number(), lat: z.number() })`. PocketBase v0.27+. An unset
geoPoint comes back as `{ lon: 0, lat: 0 }`, which the object schema accepts as-is.

### Unrecognized types

The `default` arm returns `z.unknown()`. A field type added by a future PocketBase release
generates valid (if unhelpful) output rather than crashing.

## Arrays

`isMulti(field)` is `(field.maxSelect ?? 1) > 1` — the single rule that decides array-ness for
`select`, `relation`, and `file`. `arrayOf` then adds bounds:

```ts
let expr = `z.array(${inner})`;
if (ctx.validators) {
  if (field.type === "relation" && field.required && field.minSelect && field.minSelect > 0) {
    expr += `.min(${field.minSelect})`;
  }
  if (field.maxSelect && field.maxSelect > 1) expr += `.max(${field.maxSelect})`;
}
```

`minSelect` exists only on relation fields, hence the type guard.

The **`field.required` guard is load-bearing**, not defensive. PocketBase enforces `minSelect` only
when the field actually has a value: an *optional* relation with `minSelect: 2` accepts an empty
value, and the API then returns `[]`. Emitting `.min(2)` there produces a schema that rejects real
responses. Verified against PocketBase 0.39.9:

| Field | Emitted | Accepts `[]` from the API |
| --- | --- | --- |
| `required: true`, `minSelect: 2`, `maxSelect: 5` | `z.array(RecordIdString).min(2).max(5)` | n/a — PB rejects the write |
| `required: false`, `minSelect: 2`, `maxSelect: 5` | `z.array(RecordIdString).max(5).optional()` | yes |

Regression coverage: `test/mapping.test.ts` (both branches) and the `teams.reviewers` field in
`test-e2e/fixtures/schema.ts`, which is seeded empty and validated against the live response.

## Primary key (`id`)

`baseExpr` checks `field.primaryKey` before the type switch and delegates to `idExpr`.

The goal is to emit the readable `RecordIdString` alias for the ordinary case and explicit
constraints only when the collection actually customizes its ids. `idExpr` collapses to the
alias when **both** hold:

- **Pattern is default** — absent, or exactly `^[a-z0-9]+$` (`DEFAULT_ID_PATTERN`).
- **Length is default** — each of `min`/`max` is either unset (`0`, treated as unbounded, same
  Go-zero-value rule as text) or exactly `15`.

Otherwise it builds the constraints:

```ts
let expr = "z.string()";
if (min !== undefined && min === max) expr += `.length(${min})`;
else { if (min !== undefined) expr += `.min(${min})`; if (max !== undefined) expr += `.max(${max})`; }
if (field.pattern && field.pattern !== DEFAULT_ID_PATTERN) expr += `.regex(new RegExp(${JSON.stringify(field.pattern)}))`;
```

Equal bounds collapse to `.length(n)`. A view collection whose id carries a pattern but no
length still resolves to the alias if that pattern is the default.

With `--no-validators`, `idExpr` returns `RecordIdString` immediately.

## The empty sentinel

PocketBase never omits a field from a response and never returns `null` for a plain unset
value — it returns `""`. `needsEmptyUnion` identifies the base schemas that would reject that:

```ts
if (field.type === "email" || field.type === "url") return true;
if (field.type === "select" && (field.maxSelect ?? 1) <= 1 && (field.values?.length ?? 0) > 0) return true;
return false;
```

- `z.email()` / `z.url()` reject `""`.
- A single-value `z.enum([...])` rejects `""` (unless `""` is literally one of the options).

Everything else already accepts it: `z.string()` (text, file, valueless select),
`RecordIdString` (relation, id), and `IsoDateString` (its regex has an explicit `^$` branch).
Multi-value selects are arrays — an empty one is `[]`, which needs no union. `json` takes
`.nullable()` instead.

**Ordering matters.** `.or(z.literal(""))` is appended to the *whole* base expression, after
any `.refine(...)`. So on a domain-restricted optional email, `""` short-circuits through the
union's right branch and never reaches the domain check — which is what you want, since an
empty value has no domain to check:

```ts
homepage: z.url().refine((v) => { /* domain check */ }).or(z.literal("")).optional(),
```

## Zod 3 vs Zod 4

`dialect.ts` is the entire dialect surface — three strings:

| | Zod 4 (default) | Zod 3 (`--zod 3`) |
| --- | --- | --- |
| `email` | `z.email()` | `z.string().email()` |
| `url` | `z.url()` | `z.string().url()` |
| `record` | `z.record(z.string(), z.unknown())` | `z.record(z.unknown())` |

`record` is used only for the untyped `expand` envelope. Everything else — the date alias,
enums, arrays, `.optional()`, `.nullable()`, refinements — is written once and is valid in
both majors.

Typed `expand` is Zod-4-only (it relies on getters); `--zod 3` always falls back to the
`record` envelope regardless of the `expand` option.

## `--no-validators`

Sets `ctx.validators = false`. What **drops out**:

- text/password `.min` / `.max` / `.regex`
- number `.int()` / `.min` / `.max`
- array `.min(minSelect)` / `.max(maxSelect)`
- email/url domain `.refine(...)`
- custom-id constraints (`idExpr` returns `RecordIdString`)

What **stays**, because it is structural rather than a constraint:

- array-ness from `maxSelect` (`arrayOf` still wraps; only the bounds are skipped)
- `z.enum(...)` for selects with declared values
- `.optional()` / `.nullable()`
- `.or(z.literal(""))` empty-sentinel unions
- all alias references (`IsoDateString` keeps its regex — it is an alias, not a validator)

## Record vs Response placement

`emit.ts` splits a collection's fields three ways:

- **`hidden: true` → excluded everywhere.** PocketBase never serializes these (`password`,
  `tokenKey`), so they belong in neither schema.
- **`system: true` → Response only.** `id`, `created`, `updated`, and the auth fields
  (`email`, `emailVisibility`, `verified`) are server-owned. They are appended to the Response
  via `.extend()`, alongside the envelope fields `collectionId`, `collectionName`, and `expand`.
- **everything else → Record, and inherited by Response.**

One adjustment applies inside the Record schema: `isCreateOptional` marks fields the server
fills in — the primary key, and any `text` field with an `autogeneratePattern` — so they get an
extra `.optional()` even when `required` is true. You do not have to supply a slug the server
will generate for you.

## `expand`

On the Response schema only. With Zod 4 and expand enabled, `buildExpandGetter` emits a
getter whose keys are:

- **forward relations** — the target's Response schema, arrayed when `maxSelect > 1`; an
  unresolvable target degrades to `z.unknown().optional()`
- **back-relations** — `{sourceCollection}_via_{field}`, an array by default, or a **single
  object** when the source field carries a single-column `CREATE UNIQUE INDEX`
  (`isUniqueSingleColumn` in `normalize.ts`)

Every key is `.optional()` — PocketBase only populates what the `?expand=` query asked for. A
forward field wins any name collision with a back-relation key. The getter form is what makes
circular relations typecheck; see `architecture.md`. Without Zod 4 / with `--no-expand`, the
key is `expand: <dialect.record>.optional()`.

## Worked example

From `test/fixtures/features_schema.json`:

```ts
export const PostsRecordSchema = z.object({
  title: z.string().min(3),
  slug: z.string().optional(),                        // autogeneratePattern → optional on create
  author: RecordIdString,
  reviewers: z.array(RecordIdString).min(2).max(5).optional(),
  category: RecordIdString.optional(),
  homepage: z.url().refine((v) => { try { return ["example.com"].includes(new URL(v).hostname.toLowerCase()); } catch { return false; } }).or(z.literal("")).optional(),
});

export const PostsResponseSchema = PostsRecordSchema.extend({
  id: RecordIdString,
  created: IsoDateString.optional(),
  collectionId: z.string(),
  collectionName: z.literal("posts"),
  get expand() {
    return z
      .object({
      author: AuthorsResponseSchema.optional(),
      reviewers: z.array(AuthorsResponseSchema).optional(),
      category: CategoriesResponseSchema.optional(),
      })
      .optional();
  }
});
```

And a customized primary key, from the same fixture's `profiles` collection:

```ts
id: z.string().length(10).regex(new RegExp("^p[a-z0-9]+$")),
```

## Adding a field type

1. Add the type to `FieldType` in `src/types.ts`. If it carries new options, add them to
   `Field` and to `RawField`, and read them in `normalizeField` (`src/normalize.ts`) via
   `prop()` so both the flattened v0.23+ shape and the legacy nested `options` shape work.
2. Add a `case` to `baseExpr` in `src/mapping.ts`. Decide:
   - Does it need a shared alias? Add it to `ALIAS` and to `aliasBlock()` in `src/emit.ts`
     (and to the split-mode import line, which lists the aliases explicitly).
   - Is it multi-valued? Route through `arrayOf`.
   - Does its base schema reject `""`? Add it to `needsEmptyUnion`.
   - Can it hold `null`? Handle it alongside `json` in `zodForField`.
   - Does it differ between Zod 3 and 4? Add a `Dialect` member rather than branching inline.
3. Add the field to `test/fixtures/pb_schema.json` and assert the emitted expression in
   `test/mapping.test.ts`.
4. Add a sample record to `test/generated.test.ts` so the emitted schema is compiled and
   *executed* against real-shaped data, not just string-matched.
5. If the type has non-obvious server behaviour (an empty sentinel, a bound that is optional
   at write time), extend `test-e2e/fixtures/schema.ts` so it is verified against a real
   PocketBase round-trip.
