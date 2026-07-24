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
    values: prop<string[]>(raw, "values"),
    collectionId: prop<string>(raw, "collectionId"),
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
  };
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
