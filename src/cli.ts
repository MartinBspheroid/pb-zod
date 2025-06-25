#!/usr/bin/env node

import { program } from "commander";
import { generateZodSchemas } from "./main.js";

const version = "0.1.0";

program
  .name("pocketbase-zod-generator")
  .version(version)
  .description("CLI to create Zod schemas for your pocketbase.io records.")
  .option(
    "-u, --url <url>",
    "URL to your hosted pocketbase instance. Must provide email/password or an auth token."
  )
  .option(
    "--email <email>",
    "Email for a pocketbase admin. Use with --url."
  )
  .option(
    "-p, --password <password>",
    "Password for a pocketbase admin. Use with --url."
  )
  .option(
    "-t, --token <token>",
    "Auth token for a pocketbase admin. Use with --url."
  )
  .option("-d, --db <path>", "Path to the pocketbase SQLite database.")
  .option(
    "-j, --json <path>",
    "Path to JSON schema exported from pocketbase admin UI."
  )
  .option(
    "--env [dir]",
    "Use environment variables for configuration. Add PB_TYPEGEN_URL, PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD to your .env file. Optionally provide a path to a directory containing a .env file.",
    true
  )
  .option(
    "-o, --out <path>",
    "Path to save the Zod schema output file.",
    "pocketbase-zod.ts"
  );

program.parse(process.argv);
const options = program.opts();
generateZodSchemas({
  ...options,
  out: options.out || "pocketbase-zod.ts"
});