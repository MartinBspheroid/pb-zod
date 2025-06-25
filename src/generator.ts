import type { PocketBaseCollection } from "./types.js";
import { 
  EXPORT_COMMENT,
  IMPORTS,
  ALIAS_DEFINITIONS_COMMENT,
  ALIAS_TYPE_DEFINITIONS,
  BASE_SYSTEM_FIELDS_SCHEMA,
  AUTH_SYSTEM_FIELDS_SCHEMA,
  SCHEMAS_COMMENT
} from "./constants.js";
import { createCollectionEnum } from "./collections.js";
import { createSelectOptions, createZodField } from "./fields.js";
import { toPascalCase, getSystemFieldsSchema } from "./utils.js";

export function generate(results: PocketBaseCollection[]): string {
  const collectionNames = results.map((r) => r.name).sort();
  const collectionSchemas = [];
  
  results.sort((a, b) => a.name.localeCompare(b.name));

  for (const row of results) {
    if (row.name && row.fields) {
      collectionSchemas.push(createCollectionSchema(row));
    }
  }

  const fileParts = [
    EXPORT_COMMENT,
    IMPORTS,
    createCollectionEnum(collectionNames),
    ALIAS_DEFINITIONS_COMMENT,
    ALIAS_TYPE_DEFINITIONS,
    BASE_SYSTEM_FIELDS_SCHEMA,
    AUTH_SYSTEM_FIELDS_SCHEMA,
    SCHEMAS_COMMENT,
    ...collectionSchemas,
  ];

  return fileParts.filter(Boolean).join("\n\n") + "\n";
}

export function createCollectionSchema(collectionSchemaEntry: PocketBaseCollection): string {
    const { name, fields, type } = collectionSchemaEntry;
    const pascalName = toPascalCase(name);

    // 1. Generate select option consts
    const selectOptions = createSelectOptions(name, fields);

    // 2. Generate the base record schema
    const zodFields = fields
        .map((fieldSchema) => createZodField(name, fieldSchema))
        .sort()
        .join("\n");
    
    const recordSchemaName = `${pascalName}RecordSchema`;
    const recordSchema = `export const ${recordSchemaName} = z.object({\n${zodFields}\n});`;

    // 3. Generate the response schema by merging with system fields
    const systemFieldsSchema = getSystemFieldsSchema(type);
    const responseSchemaName = `${pascalName}ResponseSchema`;
    const responseSchema = `export const ${responseSchemaName} = ${recordSchemaName}.merge(${systemFieldsSchema});`
    
    // 4. Generate TypeScript types from the Zod schemas
    const recordType = `export type ${pascalName}Record = z.infer<typeof ${recordSchemaName}>;`;
    const responseType = `export type ${pascalName}Response = z.infer<typeof ${responseSchemaName}>;`;

    return [selectOptions, recordSchema, responseSchema, recordType, responseType].filter(Boolean).join('\n\n');
}