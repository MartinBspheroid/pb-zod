import type { Field } from "./types.js";

/** `blog_posts` / `blog-posts` / `blogPosts` -> `BlogPosts`. */
export function toPascalCase(str: string): string {
  if (/^[\p{L}\d]+$/u.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str
    .replace(
      /([\p{L}\d])([\p{L}\d]*)/gu,
      (_m, a: string, b: string) => a.toUpperCase() + b.toLowerCase(),
    )
    .replace(/[^\p{L}\d]/gu, "");
}

/** Quote a field name when it isn't a bare JS identifier. */
export function safeKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/** Name of the `as const` enum values array for a select field. */
export function optionsConstName(collection: string, field: string): string {
  return `${toPascalCase(collection)}${toPascalCase(field)}Options`;
}

export function recordSchemaName(collection: string): string {
  return `${toPascalCase(collection)}RecordSchema`;
}

export function responseSchemaName(collection: string): string {
  return `${toPascalCase(collection)}ResponseSchema`;
}

export function recordTypeName(collection: string): string {
  return `${toPascalCase(collection)}Record`;
}

export function responseTypeName(collection: string): string {
  return `${toPascalCase(collection)}Response`;
}

/** De-duplicate select values, preserving order. */
export function uniqueValues(field: Field): string[] {
  const values = field.values ?? [];
  return values.filter((v, i) => values.indexOf(v) === i);
}
