import { generate } from "./emit.js";
import { fromJSON } from "./fetchers/json.js";
import { fromURL } from "./fetchers/remote.js";
import { fromDatabase } from "./fetchers/sqlite.js";
import { resolveEnv, writeFiles } from "./io.js";
import type { Collection, EmitFile, GenerateOptions } from "./types.js";

export interface RunOptions extends GenerateOptions {
  // ── source (choose one) ──
  db?: string;
  json?: string;
  url?: string;
  email?: string;
  password?: string;
  token?: string;
  /** Read config from env / a .env file. `true` or a path to the .env file. */
  env?: boolean | string;
  /** Include PocketBase system collections (`_superusers`, …). Default false. */
  includeSystem?: boolean;
  /** Output file (single mode) or directory (split mode). */
  out?: string;
}

export const DEFAULT_OUT = "pocketbase-zod.ts";
export const DEFAULT_OUT_DIR = "pocketbase-zod";

/** Fetch + normalize collections from whichever source the options specify. */
export async function collectFromSource(options: RunOptions): Promise<Collection[]> {
  const includeSystem = options.includeSystem;

  if (options.db) return fromDatabase(options.db, { includeSystem });
  if (options.json) return fromJSON(options.json, { includeSystem });
  if (options.url) {
    return fromURL(
      options.url,
      { token: options.token, email: options.email, password: options.password },
      { includeSystem },
    );
  }
  if (options.env) {
    const env = await resolveEnv(typeof options.env === "string" ? options.env : undefined);
    const url = env.PB_TYPEGEN_URL;
    if (!url) throw new Error("Missing PB_TYPEGEN_URL (set it in your environment or .env file).");
    return fromURL(
      url,
      {
        token: env.PB_TYPEGEN_TOKEN,
        email: env.PB_TYPEGEN_EMAIL,
        password: env.PB_TYPEGEN_PASSWORD,
      },
      { includeSystem },
    );
  }

  throw new Error(
    "No schema source provided. Use one of --db <file>, --json <file>, --url <url>, or --env.",
  );
}

/** Fetch collections and return the generated file(s) without writing to disk. */
export async function generateFiles(options: RunOptions): Promise<EmitFile[]> {
  const collections = await collectFromSource(options);
  return generate(collections, options);
}

export interface RunResult {
  collections: number;
  files: string[];
}

/** End-to-end: fetch a source, generate, and write the output file(s). */
export async function run(options: RunOptions): Promise<RunResult> {
  const collections = await collectFromSource(options);
  const files = generate(collections, options);
  const out = options.out ?? (options.split ? DEFAULT_OUT_DIR : DEFAULT_OUT);
  const written = await writeFiles(files, out, Boolean(options.split));
  return { collections: collections.length, files: written };
}
