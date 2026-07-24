#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import { DEFAULT_OUT, DEFAULT_OUT_DIR, type RunOptions, run } from "./run.js";
import type { ZodTarget } from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("pb-ts-zod")
  .version(pkg.version)
  .description(
    "Generate Zod schemas + TypeScript types from PocketBase collections.\n" +
      "Works offline from a SQLite file or pb_schema.json, or live from a running instance.",
  )
  .option(
    "-d, --db <path>",
    "PocketBase SQLite database file (pb_data/data.db) — offline, no server",
  )
  .option("-j, --json <path>", "pb_schema.json export file — offline, no server")
  .option("-u, --url <url>", "URL of a running PocketBase instance")
  .option("--email <email>", "Superuser email (with --url)")
  .option("-p, --password <password>", "Superuser password (with --url)")
  .option("-t, --token <token>", "Superuser auth token (with --url)")
  .option(
    "--env [path]",
    "Read PB_TYPEGEN_URL / _EMAIL / _PASSWORD / _TOKEN from env or a .env file",
  )
  .option("-o, --out <path>", "Output file, or directory when --split is set")
  .option("--zod <version>", "Zod major version to target: 3 or 4", "4")
  .option("--split", "Emit one module per collection instead of a single file", false)
  .option("--no-validators", "Skip min/max/regex/int validators; emit bare types")
  .option("--include-system", "Include PocketBase system collections (_superusers, …)", false)
  .action(async (opts) => {
    const zod = opts.zod === "3" ? 3 : 4;
    if (opts.zod !== "3" && opts.zod !== "4") {
      console.error(`Invalid --zod value "${opts.zod}". Use 3 or 4.`);
      process.exit(1);
    }

    const options: RunOptions = {
      db: opts.db,
      json: opts.json,
      url: opts.url,
      email: opts.email,
      password: opts.password,
      token: opts.token,
      env: opts.env,
      out: opts.out ?? (opts.split ? DEFAULT_OUT_DIR : DEFAULT_OUT),
      zod: zod as ZodTarget,
      split: Boolean(opts.split),
      validators: opts.validators !== false,
      includeSystem: Boolean(opts.includeSystem),
    };

    try {
      const result = await run(options);
      const target = result.files.length === 1 ? result.files[0] : `${result.files.length} files`;
      console.error(
        `✓ Generated Zod ${zod} schemas for ${result.collections} collection(s) → ${target}`,
      );
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
