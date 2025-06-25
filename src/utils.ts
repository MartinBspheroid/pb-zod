import { promises as fs } from "fs";
import type { PocketBaseField } from "./types.js";

export function toPascalCase(str: string): string {
  if (/^[\p{L}\d]+$/iu.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str.replace(
    /([\p{L}\d])([\p{L}\d]*)/giu,
    (_g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()
  ).replace(/[^\p{L}\d]/giu, "");
}

export function sanitizeFieldName(name: string): string {
  return !isNaN(parseFloat(name.charAt(0))) || name.includes('-') ? `"${name}"` : name;
}

export async function saveFile(outPath: string, typeString: string): Promise<void> {
  await fs.writeFile(outPath, typeString, "utf8");
  console.log(`Created Zod schemas at ${outPath}`);
}

export function getSystemFieldsSchema(type: string): string {
  switch (type) {
    case "auth":
      return "AuthSystemFieldsSchema";
    default:
      return "BaseSystemFieldsSchema";
  }
}

export function getOptionEnumName(recordName: string, fieldName: string): string {
  return `${toPascalCase(recordName)}${toPascalCase(fieldName)}Options`;
}

export function getOptionValues(field: PocketBaseField): string[] {
  const values = field.values || field.options?.values;
  if (!values) return [];
  return values.filter((val: any, i: number) => values.indexOf(val) === i);
}