import { DatabaseSync } from "node:sqlite";
import { normalizeCollections } from "../normalize.js";
import type { Collection, RawCollection } from "../types.js";

interface CollectionRow {
  id?: string;
  name: string;
  type?: string;
  system?: number;
  /** v0.23+ */
  fields?: string;
  /** <=v0.22 */
  schema?: string;
  /** JSON array of raw CREATE INDEX SQL strings */
  indexes?: string;
}

function parseJsonColumn(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Read collections directly from a PocketBase SQLite database file
 * (`pb_data/data.db`) using Node's built-in `node:sqlite` — no running server,
 * no admin credentials, no native dependency. Requires Node 22.5+.
 *
 * The `_collections` table holds one row per collection; the field definitions
 * live in the `fields` column (named `schema` before PB v0.23).
 */
export function fromDatabase(dbPath: string, opts: { includeSystem?: boolean } = {}): Collection[] {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db.prepare("SELECT * FROM _collections").all() as unknown as CollectionRow[];
    const raw: RawCollection[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      system: Boolean(row.system),
      fields: parseJsonColumn(row.fields ?? row.schema) as RawCollection["fields"],
      indexes: parseJsonColumn(row.indexes) as string[],
    }));
    return normalizeCollections(raw, opts);
  } finally {
    db.close();
  }
}
