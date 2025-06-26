import dotenv from "dotenv-flow";
import type { GenerationOptions, PocketBaseCollection } from "./types.js";
import { fromDatabase, fromJSON, fromURLWithToken, fromURLWithPassword } from "./schema-fetchers.js";
import { generate } from "./generator.js";
import { saveFile } from "./utils.js";

export async function generateZodSchemas(options: GenerationOptions): Promise<string | undefined> {
  if (!options.out) {
    options.out = "pocketbase-zod.ts";
  }
  let schema: PocketBaseCollection[];
  
  if (options.db) {
    schema = await fromDatabase(options.db);
  } else if (options.json) {
    schema = await fromJSON(options.json);
  } else if (options.url && options.token) {
    schema = await fromURLWithToken(options.url, options.token);
  } else if (options.url) {
    schema = await fromURLWithPassword(
      options.url,
      options.email,
      options.password
    );
  } else if (options.env) {
    dotenv.config(
      typeof options.env === "string" ? { path: options.env } : void 0
    );
    if (!process.env.PB_TYPEGEN_URL) {
      console.error("Missing PB_TYPEGEN_URL environment variable");
      return;
    }
    if (process.env.PB_TYPEGEN_TOKEN) {
      schema = await fromURLWithToken(
        process.env.PB_TYPEGEN_URL,
        process.env.PB_TYPEGEN_TOKEN
      );
    } else if (process.env.PB_TYPEGEN_EMAIL && process.env.PB_TYPEGEN_PASSWORD) {
      schema = await fromURLWithPassword(
        process.env.PB_TYPEGEN_URL,
        process.env.PB_TYPEGEN_EMAIL,
        process.env.PB_TYPEGEN_PASSWORD
      );
    } else {
      console.error(
        "Missing PB_TYPEGEN_EMAIL/PB_TYPEGEN_PASSWORD or PB_TYPEGEN_TOKEN environment variables"
      );
      return;
    }
  } else {
    console.error(
      "Missing schema path. Check options: pocketbase-zod-generator --help"
    );
    return;
  }
  
  // Determine the source URL to pass to the generator
  let sourceUrl = "unknown";
  if (options.url) {
    sourceUrl = options.url;
  } else if (options.env && process.env.PB_TYPEGEN_URL) {
    sourceUrl = process.env.PB_TYPEGEN_URL;
  } else if (options.db) {
    sourceUrl = `local database: ${options.db}`;
  } else if (options.json) {
    sourceUrl = `local JSON file: ${options.json}`;
  }

  const typeString = generate(schema, sourceUrl);
  await saveFile(options.out, typeString);
  return typeString;
}

export * from "./types.js";
export * from "./generator.js";
export * from "./schema-fetchers.js";