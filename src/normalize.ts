import type { Collection, CollectionType, Field, RawCollection, RawField } from "./types.js";

const COLLECTION_TYPES: CollectionType[] = ["base", "auth", "view"];

/** Read a prop from the flattened field, falling back to the pre-0.23 nested `options`. */
function prop<T>(raw: RawField, key: string): T | undefined {
  const flat = raw[key];
  if (flat !== undefined && flat !== null) return flat as T;
  const nested = raw.options?.[key];
  return (nested === null ? undefined : nested) as T | undefined;
}

function normalizeField(raw: RawField): Field {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    required: Boolean(raw.required),
    system: Boolean(raw.system),
    hidden: Boolean(raw.hidden),
    presentable: raw.presentable,
    primaryKey: raw.primaryKey,
    min: prop<number | string>(raw, "min"),
    max: prop<number | string>(raw, "max"),
    pattern: prop<string>(raw, "pattern"),
    onlyInt: prop<boolean>(raw, "onlyInt"),
    maxSelect: prop<number>(raw, "maxSelect"),
    minSelect: prop<number>(raw, "minSelect"),
    values: prop<string[]>(raw, "values"),
    collectionId: prop<string>(raw, "collectionId"),
    autogeneratePattern: prop<string>(raw, "autogeneratePattern"),
    onlyDomains: prop<string[]>(raw, "onlyDomains"),
    exceptDomains: prop<string[]>(raw, "exceptDomains"),
  };
}

function normalizeType(type: string | undefined): CollectionType {
  return COLLECTION_TYPES.includes(type as CollectionType) ? (type as CollectionType) : "base";
}

/** Normalize one raw collection (modern or legacy) into the internal model. */
export function normalizeCollection(raw: RawCollection): Collection {
  const rawFields = raw.fields ?? raw.schema ?? [];
  return {
    id: raw.id ?? "",
    name: raw.name,
    type: normalizeType(raw.type),
    system: Boolean(raw.system),
    fields: rawFields.map(normalizeField),
    indexes: Array.isArray(raw.indexes) ? raw.indexes : [],
  };
}

/**
 * True if `indexes` contains a single-column `CREATE UNIQUE INDEX` on exactly
 * `fieldName`. PocketBase resolves a back-relation as a single object (not an
 * array) when the source relation field is uniquely indexed.
 */
export function isUniqueSingleColumn(indexes: string[], fieldName: string): boolean {
  const strip = (c: string) =>
    c
      .trim()
      .replace(/^[`"[]/, "")
      .replace(/[`"\]]$/, "")
      .replace(/\s+(asc|desc)$/i, "")
      .trim();
  for (const idx of indexes) {
    const m = /create\s+unique\s+index\s+.*?\bon\b\s+\S+\s*\(([^)]*)\)/i.exec(idx);
    if (!m) continue;
    const cols = m[1]!.split(",").map(strip);
    if (cols.length === 1 && cols[0] === fieldName) return true;
  }
  return false;
}

/**
 * Normalize a list of raw collections and drop system collections
 * (`_superusers`, `_authOrigins`, …) unless `includeSystem` is set.
 */
export function normalizeCollections(
  raw: RawCollection[],
  { includeSystem = false }: { includeSystem?: boolean } = {},
): Collection[] {
  return raw
    .filter((c) => c && typeof c.name === "string")
    .map(normalizeCollection)
    .filter((c) => includeSystem || (!c.system && !c.name.startsWith("_")));
}
