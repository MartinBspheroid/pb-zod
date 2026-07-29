/**
 * pb-ts-zod — generate Zod schemas + TypeScript types from PocketBase collections.
 *
 * @example
 * ```ts
 * import { fromDatabase, generate } from "pb-ts-zod";
 *
 * const collections = fromDatabase("./pb_data/data.db");
 * const [file] = generate(collections, { zod: 4 });
 * console.log(file.content);
 * ```
 */

export { generate } from "./emit.js";
export { fromJSON } from "./fetchers/json.js";
export { fromURL, type RemoteAuth } from "./fetchers/remote.js";
export { fromDatabase } from "./fetchers/sqlite.js";
export { normalizeCollection, normalizeCollections } from "./normalize.js";
export {
  collectFromSource,
  DEFAULT_OUT,
  DEFAULT_OUT_DIR,
  generateFiles,
  type RunOptions,
  type RunResult,
  run,
} from "./run.js";
export type {
  Collection,
  CollectionType,
  EmitFile,
  Field,
  FieldType,
  GenerateOptions,
  RawCollection,
  RawField,
  ZodTarget,
} from "./types.js";
