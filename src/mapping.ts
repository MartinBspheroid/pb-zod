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

function toNumber(v: number | string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** select/relation/file are arrays when maxSelect > 1, scalars otherwise. */
function isMulti(field: Field): boolean {
  return (field.maxSelect ?? 1) > 1;
}

/** Build the base Zod expression for a field's *value* (before optional/nullable). */
function baseExpr(field: Field, ctx: MapContext): string {
  const { dialect: d, validators } = ctx;

  // The primary key (`id`) is always a record-id string, regardless of its
  // underlying text constraints — keep it readable via the alias.
  if (field.primaryKey) return ALIAS.recordId;

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
      return d.email;

    case "url":
      return d.url;

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
  if (ctx.validators && field.maxSelect && field.maxSelect > 1) {
    expr += `.max(${field.maxSelect})`;
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
