import type { PocketBaseCollection } from "./types.js";
import { 
  EXPORT_COMMENT,
  IMPORTS,
  ALIAS_DEFINITIONS_COMMENT,
  ALIAS_TYPE_DEFINITIONS,
  BASE_SYSTEM_FIELDS_SCHEMA,
  AUTH_SYSTEM_FIELDS_SCHEMA,
  SCHEMAS_COMMENT,
  GENERATED_FROM_URL_COMMENT,
  GENERATION_TIMESTAMP_COMMENT,
  INFERRED_TYPES_COMMENT
} from "./constants.js";
import { createCollectionEnum } from "./collections.js";
import { createSelectOptions, createZodField } from "./fields.js";
import { toPascalCase, getSystemFieldsSchema } from "./utils.js";

export function generate(results: PocketBaseCollection[], sourceUrl: string): string {
  const collectionNames = results.map((r) => r.name).sort();
  const allSchemas = [];
  const allTypes = [];
  const timestamp = new Date().toISOString();
  
  results.sort((a, b) => a.name.localeCompare(b.name));

  for (const row of results) {
    if (row.name && row.fields) {
      const { schema, type } = createCollectionSchema(row);
      allSchemas.push(schema);
      allTypes.push(type);
    }
  }

  const fileParts = [
    GENERATED_FROM_URL_COMMENT(sourceUrl),
    GENERATION_TIMESTAMP_COMMENT(timestamp),
    EXPORT_COMMENT,
    IMPORTS,
    createCollectionEnum(collectionNames),
    ALIAS_DEFINITIONS_COMMENT,
    ALIAS_TYPE_DEFINITIONS,
    BASE_SYSTEM_FIELDS_SCHEMA,
    AUTH_SYSTEM_FIELDS_SCHEMA,
    SCHEMAS_COMMENT,
    ...allSchemas,
    INFERRED_TYPES_COMMENT,
    ...allTypes,
  ];

  return fileParts.filter(Boolean).join("\n\n") + "\n";
}

export function createCollectionSchema(collectionSchemaEntry: PocketBaseCollection): { schema: string, type: string } {
    const { name, fields, type } = collectionSchemaEntry; // Reverted to use fields directly
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

    const schemaString = [selectOptions, recordSchema, responseSchema].filter(Boolean).join('\n\n');
    const typeString = [recordType, responseType].filter(Boolean).join('\n\n');

    return { schema: schemaString, type: typeString };
}