import { toPascalCase } from "./utils.js";

export function createCollectionEnum(collectionNames: string[]): string {
  const collections = collectionNames.map((name) => `\t${toPascalCase(name)} = "${name}",`).join("\n");
  const typeString = `export enum Collections {
${collections}
}`;
  return typeString;
}