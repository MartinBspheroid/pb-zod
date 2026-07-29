import type { ZodTarget } from "./types.js";

/**
 * The bits of Zod surface that differ between v3 and v4.
 * v4 promoted string formats to top-level (`z.email()`); v3 keeps them as
 * string methods (`z.string().email()`).
 *
 * Note: date/datetime is intentionally NOT dialect-dependent — PocketBase
 * serializes dates as `YYYY-MM-DD HH:MM:SS.sssZ` (a space, not `T`), which
 * `z.iso.datetime()` / `z.string().datetime()` both reject. We emit a
 * PB-accurate regex alias instead (see `IsoDateString` in the emitter).
 */
export interface Dialect {
  target: ZodTarget;
  email: string;
  url: string;
  /** `z.record(...)` for the dynamic `expand` envelope. */
  record: string;
}

export function dialect(target: ZodTarget): Dialect {
  if (target === 3) {
    return {
      target,
      email: "z.string().email()",
      url: "z.string().url()",
      record: "z.record(z.unknown())",
    };
  }
  return {
    target,
    email: "z.email()",
    url: "z.url()",
    record: "z.record(z.string(), z.unknown())",
  };
}
