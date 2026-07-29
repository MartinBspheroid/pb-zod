import { readFile } from "node:fs/promises";
import { normalizeCollections } from "../normalize.js";
import type { Collection, RawCollection } from "../types.js";

/**
 * Read collections from a `pb_schema.json` export (Dashboard → Settings →
 * Export collections) or any JSON file containing an array of collections.
 */
export async function fromJSON(
  path: string,
  opts: { includeSystem?: boolean } = {},
): Promise<Collection[]> {
  const text = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse JSON schema at ${path}: ${(err as Error).message}`);
  }
  // Accept both a bare array and a wrapped `{ collections: [...] }` shape.
  const raw = Array.isArray(parsed)
    ? parsed
    : ((parsed as { collections?: unknown }).collections ?? null);
  if (!Array.isArray(raw)) {
    throw new Error(
      `Expected an array of collections in ${path} (or a { "collections": [...] } object).`,
    );
  }
  return normalizeCollections(raw as RawCollection[], opts);
}
