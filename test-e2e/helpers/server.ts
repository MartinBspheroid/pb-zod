import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export const PB_VERSION = process.env.PB_VERSION ?? "0.39.9";
const CACHE_ROOT = resolve("test-e2e/.pb-cache");

function assetName(version: string): { file: string; bin: string } {
  const os = { linux: "linux", darwin: "darwin", win32: "windows" }[process.platform];
  const arch = { x64: "amd64", arm64: "arm64" }[process.arch as "x64" | "arm64"];
  if (!os || !arch) throw new Error(`Unsupported platform ${process.platform}/${process.arch}`);
  return {
    file: `pocketbase_${version}_${os}_${arch}.zip`,
    bin: process.platform === "win32" ? "pocketbase.exe" : "pocketbase",
  };
}

/** Download + cache the PocketBase binary for this platform; returns its path. */
export async function ensurePocketBase(version = PB_VERSION): Promise<string> {
  const { file, bin } = assetName(version);
  const dir = join(CACHE_ROOT, version);
  const binPath = join(dir, bin);
  if (existsSync(binPath)) return binPath;

  await mkdir(dir, { recursive: true });
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download PocketBase ${version}: ${res.status} ${url}`);
  const zipPath = join(dir, file);
  await Bun.write(zipPath, await res.arrayBuffer());

  const unzip = Bun.spawnSync(["unzip", "-oq", zipPath, "-d", dir]);
  if (unzip.exitCode !== 0) {
    throw new Error(`unzip failed: ${unzip.stderr.toString()} (is \`unzip\` installed?)`);
  }
  await rm(zipPath, { force: true });
  if (!existsSync(binPath)) throw new Error(`PocketBase binary not found after unzip at ${binPath}`);
  return binPath;
}

export interface PocketBaseHandle {
  url: string;
  dataDir: string;
  dbPath: string;
  binary: string;
  superuser: { email: string; password: string };
  stop(): Promise<void>;
}

export interface StartOptions {
  version?: string;
  port?: number;
  dataDir?: string;
  email?: string;
  password?: string;
}

async function waitForHealth(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await Bun.sleep(120);
  }
  throw new Error(`PocketBase health check timed out after ${timeoutMs}ms`);
}

/**
 * Provision a fresh PocketBase instance: create a superuser, start the server,
 * and wait until it's healthy. Call `handle.stop()` to shut it down (which
 * checkpoints the WAL so the SQLite file is safe to read).
 */
export async function startPocketBase(opts: StartOptions = {}): Promise<PocketBaseHandle> {
  const version = opts.version ?? PB_VERSION;
  const port = opts.port ?? 8090 + Math.floor(process.pid % 900);
  const dataDir = resolve(opts.dataDir ?? `test-e2e/.tmp/pb-${port}`);
  const email = opts.email ?? "admin@test.local";
  const password = opts.password ?? "password12345";
  const url = `http://127.0.0.1:${port}`;

  const binary = await ensurePocketBase(version);
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dirname(dataDir), { recursive: true });

  // Keep auto-generated migration files INSIDE the ephemeral data dir. PB's
  // default migrations dir is a sibling of the data dir, which would otherwise
  // leak across runs and get replayed on a fresh DB (breaking startup).
  const migrationsDir = join(dataDir, "pb_migrations");
  const common = ["--dir", dataDir, "--migrationsDir", migrationsDir];

  const created = Bun.spawnSync([binary, "superuser", "upsert", email, password, ...common]);
  if (created.exitCode !== 0) {
    throw new Error(`superuser upsert failed: ${created.stderr.toString()}`);
  }

  const logPath = join(dirname(dataDir), `pb-${port}.log`);
  const proc = Bun.spawn([binary, "serve", "--http", `127.0.0.1:${port}`, ...common], {
    stdout: "ignore",
    stderr: Bun.file(logPath),
  });

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    proc.kill();
    await proc.exited;
  };

  try {
    await waitForHealth(url);
  } catch (err) {
    await stop();
    const log = await Bun.file(logPath)
      .text()
      .catch(() => "");
    throw new Error(`${(err as Error).message}${log ? `\nPocketBase log:\n${log}` : ""}`);
  }

  return {
    url,
    dataDir,
    dbPath: join(dataDir, "data.db"),
    binary,
    superuser: { email, password },
    stop,
  };
}
