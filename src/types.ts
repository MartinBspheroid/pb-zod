/**
 * Internal, normalized model plus the raw PocketBase shapes we read from.
 *
 * PocketBase v0.23+ renamed the collection field array `schema` -> `fields` and
 * flattened field options onto the field object (the old nested `options: {}`
 * is gone). We normalize both the modern and legacy shapes into {@link Collection}.
 */

export type CollectionType = "base" | "auth" | "view";

/** Known PocketBase field types (as of PB v0.39). Unknown types fall back to `z.unknown()`. */
export type FieldType =
  | "text"
  | "editor"
  | "number"
  | "bool"
  | "email"
  | "url"
  | "date"
  | "autodate"
  | "select"
  | "relation"
  | "file"
  | "json"
  | "geoPoint"
  | "password"
  // legacy / deprecated
  | "user";

/** A normalized field, with type-specific props flattened. */
export interface Field {
  id?: string;
  name: string;
  type: FieldType | (string & {});
  required: boolean;
  system: boolean;
  hidden: boolean;
  presentable?: boolean;
  primaryKey?: boolean;
  /** number/text/date bounds; text length; select/relation/file counts live in maxSelect */
  min?: number | string;
  max?: number | string;
  /** text validation pattern */
  pattern?: string;
  /** number fields: integer-only */
  onlyInt?: boolean;
  /** select / relation / file: 1 => scalar, >1 => array */
  maxSelect?: number;
  /** relation only: minimum number of related records (array length floor) */
  minSelect?: number;
  /** select: allowed values */
  values?: string[];
  /** relation: target collection id */
  collectionId?: string;
  /** text: server auto-fills a value from this pattern -> optional on create */
  autogeneratePattern?: string;
  /** email/url: allow-list of domains (mutually exclusive with exceptDomains) */
  onlyDomains?: string[];
  /** email/url: deny-list of domains */
  exceptDomains?: string[];
}

/** A normalized collection. */
export interface Collection {
  id: string;
  name: string;
  type: CollectionType;
  system: boolean;
  fields: Field[];
  /** raw `CREATE INDEX` SQL strings (used to detect unique single-column relations) */
  indexes: string[];
}

/** Raw field as returned by the PB API / stored in `_collections.fields`. */
export interface RawField {
  id?: string;
  name: string;
  type: string;
  required?: boolean;
  system?: boolean;
  hidden?: boolean;
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
  /** pre-0.23 nested options */
  options?: Record<string, any>;
  [key: string]: any;
}

/** Raw collection as returned by the PB API / stored in `_collections`. */
export interface RawCollection {
  id?: string;
  name: string;
  type?: string;
  system?: boolean;
  /** modern (v0.23+) */
  fields?: RawField[];
  /** legacy (<=v0.22) */
  schema?: RawField[];
  /** raw `CREATE INDEX` SQL strings */
  indexes?: string[];
  [key: string]: any;
}

/** Which Zod major version the emitted code should target. */
export type ZodTarget = 3 | 4;

export interface GenerateOptions {
  /** Zod major to emit for. Default 4. */
  zod?: ZodTarget;
  /** Emit `.min/.max/.regex/.int` validators from PB constraints. Default true. */
  validators?: boolean;
  /** Emit a separate module per collection instead of one file. Default false. */
  split?: boolean;
  /** Emit typed per-relation `expand` keys (Zod 4 only). Default true. */
  expand?: boolean;
  /** Include back-relation (`{coll}_via_{field}`) expand keys. Default true. */
  backRelations?: boolean;
}

export interface EmitFile {
  /** filename (for split mode) or "" for the single default file */
  name: string;
  content: string;
}
