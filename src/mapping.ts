import type { Dialect } from "./dialect.js";
import { optionsConstName } from "./naming.js";
import type { Field } from "./types.js";

/** Alias identifiers emitted once at the top of the output and referenced here. */
export const ALIAS = {
  recordId: "RecordIdString",
  isoDate: "IsoDateString",
  html: "HTMLString",
  geoPoint: "GeoPoint",
} as const;

export interface MapContext {
  collectionName: string;
  dialect: Dialect;
  validators: boolean;
}

/** PocketBase's default primary-key id pattern. */
const DEFAULT_ID_PATTERN = "^[a-z0-9]+$";

function toNumber(v: number | string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** select/relation/file are arrays when maxSelect > 1, scalars otherwise. */
function isMulti(field: Field): boolean {
  return (field.maxSelect ?? 1) > 1;
}

/**
 * Primary-key (`id`) mapping. The default 15-char lowercase id (and a view's
 * pattern-only id) use the readable `RecordIdString` alias; a collection with a
 * customized id length/pattern emits those constraints instead.
 */
function idExpr(field: Field, ctx: MapContext): string {
  if (!ctx.validators) return ALIAS.recordId;
  // PocketBase text min/max use 0 (the Go int zero value) to mean "unbounded".
  const rawMin = toNumber(field.min);
  const rawMax = toNumber(field.max);
  const min = rawMin && rawMin > 0 ? rawMin : undefined;
  const max = rawMax && rawMax > 0 ? rawMax : undefined;
  const patternDefault = !field.pattern || field.pattern === DEFAULT_ID_PATTERN;
  const lengthDefault = (min === undefined || min === 15) && (max === undefined || max === 15);
  if (patternDefault && lengthDefault) return ALIAS.recordId;

  let expr = "z.string()";
  if (min !== undefined && min === max) expr += `.length(${min})`;
  else {
    if (min !== undefined) expr += `.min(${min})`;
    if (max !== undefined) expr += `.max(${max})`;
  }
  if (field.pattern && field.pattern !== DEFAULT_ID_PATTERN) {
    expr += `.regex(new RegExp(${JSON.stringify(field.pattern)}))`;
  }
  return expr;
}

/** email/url domain allow/deny lists -> a best-effort `.refine(...)`. */
function withDomains(base: string, field: Field, kind: "email" | "url", ctx: MapContext): string {
  if (!ctx.validators) return base;
  const only = field.onlyDomains?.length ? field.onlyDomains : undefined;
  const except = field.exceptDomains?.length ? field.exceptDomains : undefined;
  const domains = only ?? except;
  if (!domains) return base;
  const list = JSON.stringify(domains.map((d) => d.toLowerCase()));
  const negate = except ? "!" : "";
  if (kind === "email") {
    return `${base}.refine((v) => ${negate}${list}.includes(v.slice(v.lastIndexOf("@") + 1).toLowerCase()))`;
  }
  return `${base}.refine((v) => { try { return ${negate}${list}.includes(new URL(v).hostname.toLowerCase()); } catch { return false; } })`;
}

/** Build the base Zod expression for a field's *value* (before optional/nullable). */
function baseExpr(field: Field, ctx: MapContext): string {
  const { dialect: d, validators } = ctx;

  // The primary key (`id`): alias for the default id, explicit constraints if customized.
  if (field.primaryKey) return idExpr(field, ctx);

  switch (field.type) {
    case "text":
    case "password": {
      let expr = "z.string()";
      if (validators) {
        const min = toNumber(field.min);
        const max = toNumber(field.max);
        if (min) expr += `.min(${min})`;
        if (max) expr += `.max(${max})`;
        if (field.pattern) expr += `.regex(new RegExp(${JSON.stringify(field.pattern)}))`;
      }
      return expr;
    }

    case "editor":
      return ALIAS.html;

    case "number": {
      let expr = "z.number()";
      if (validators) {
        if (field.onlyInt) expr += ".int()";
        const min = toNumber(field.min);
        const max = toNumber(field.max);
        if (min !== undefined) expr += `.min(${min})`;
        if (max !== undefined) expr += `.max(${max})`;
      }
      return expr;
    }

    case "bool":
      return "z.boolean()";

    case "email":
      return withDomains(d.email, field, "email", ctx);

    case "url":
      return withDomains(d.url, field, "url", ctx);

    case "date":
    case "autodate":
      return ALIAS.isoDate;

    case "geoPoint":
      return ALIAS.geoPoint;

    case "json":
      return "z.unknown()";

    case "select": {
      // A select with no declared values can't become an enum; fall back to string.
      const base =
        (field.values?.length ?? 0) > 0
          ? `z.enum(${optionsConstName(ctx.collectionName, field.name)})`
          : "z.string()";
      return isMulti(field) ? arrayOf(base, field, ctx) : base;
    }

    case "relation":
    case "user": {
      const base = ALIAS.recordId;
      return isMulti(field) ? arrayOf(base, field, ctx) : base;
    }

    case "file": {
      const base = "z.string()";
      return isMulti(field) ? arrayOf(base, field, ctx) : base;
    }

    default:
      return "z.unknown()";
  }
}

function arrayOf(inner: string, field: Field, ctx: MapContext): string {
  let expr = `z.array(${inner})`;
  if (ctx.validators) {
    // minSelect exists only on relation fields.
    if (field.type === "relation" && field.minSelect && field.minSelect > 0) {
      expr += `.min(${field.minSelect})`;
    }
    if (field.maxSelect && field.maxSelect > 1) {
      expr += `.max(${field.maxSelect})`;
    }
  }
  return expr;
}

/**
 * PocketBase returns the empty sentinel `""` (not `null`/absent) for unset
 * optional fields. `z.string()`, the id alias and the date regex already accept
 * `""`, but `z.email()`, `z.url()` and a single `z.enum(...)` do not — so those
 * need an explicit `.or(z.literal(""))` when the field isn't required.
 */
function needsEmptyUnion(field: Field): boolean {
  if (field.type === "email" || field.type === "url") return true;
  if (field.type === "select" && (field.maxSelect ?? 1) <= 1 && (field.values?.length ?? 0) > 0) {
    return true;
  }
  return false;
}

/** Full Zod expression for a field, including empty-sentinel / optional / nullable modifiers. */
export function zodForField(field: Field, ctx: MapContext): string {
  let expr = baseExpr(field, ctx);
  if (field.required) return expr;

  // json is the one PB type that can genuinely hold null.
  if (field.type === "json") {
    expr += ".nullable()";
  } else if (needsEmptyUnion(field)) {
    expr += '.or(z.literal(""))';
  }
  return `${expr}.optional()`;
}
