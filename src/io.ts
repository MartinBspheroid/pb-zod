import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EmitFile } from "./types.js";

/** Minimal `.env` parser (KEY=VALUE, `#` comments, optional quotes) — no dependency. */
export async function loadEnvFile(path: string): Promise<Record<string, string>> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Resolve config from a `.env` file (if `path` given, else `.env` in cwd),
 * layered under real environment variables (process.env wins).
 */
export async function resolveEnv(path?: string): Promise<Record<string, string | undefined>> {
  const fromFile = await loadEnvFile(path ?? ".env");
  return { ...fromFile, ...process.env };
}

/**
 * Write generated files. In single mode `out` is a file path; in split mode it's
 * a directory that receives one file per collection plus `_shared.ts`/`index.ts`.
 */
export async function writeFiles(
  files: EmitFile[],
  out: string,
  split: boolean,
): Promise<string[]> {
  if (!split) {
    await mkdir(dirname(out) || ".", { recursive: true });
    await writeFile(out, files[0]!.content, "utf8");
    return [out];
  }
  await mkdir(out, { recursive: true });
  const written: string[] = [];
  for (const file of files) {
    const dest = join(out, file.name);
    await writeFile(dest, file.content, "utf8");
    written.push(dest);
  }
  return written;
}
