import type { PocketBaseField, FieldTypeMap } from "./types.js";
import { 
  RECORD_ID_STRING_NAME, 
  ISO_DATE_STRING_NAME, 
  HTML_STRING_NAME 
} from "./constants.js";
import { 
  sanitizeFieldName, 
  getOptionEnumName, 
  getOptionValues 
} from "./utils.js";

export const pbSchemaZodMap: FieldTypeMap = {
    text: () => `z.string()`,
    number: () => `z.number()`,
    bool: () => `z.boolean()`,
    email: () => `z.string().email()`,
    url: () => `z.string().url()`,
    date: () => ISO_DATE_STRING_NAME,
    autodate: () => ISO_DATE_STRING_NAME,
    password: () => `z.string()`,
    select: (fieldSchema: PocketBaseField, collectionName: string) => {
        const optionName = getOptionEnumName(collectionName, fieldSchema.name);
        const baseEnum = `z.enum(${optionName})`;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${baseEnum})`
            : baseEnum;
    },
    json: () => `z.any()`,
    file: (fieldSchema: PocketBaseField) => {
        const base = `z.string()`;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${base})`
            : base;
    },
    relation: (fieldSchema: PocketBaseField) => {
        const base = RECORD_ID_STRING_NAME;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect === 1
            ? base
            : `z.array(${base})`;
    },
    user: (fieldSchema: PocketBaseField) => { // Deprecated but handle gracefully
        const base = RECORD_ID_STRING_NAME;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${base})`
            : base;
    },
    editor: () => HTML_STRING_NAME,
};

export function createZodField(collectionName: string, fieldSchema: PocketBaseField): string {
  let typeStringFunc: ((fieldSchema: PocketBaseField, collectionName: string) => string) | (() => string);
  if (!(fieldSchema.type in pbSchemaZodMap)) {
    console.log(`WARNING: unknown type "${fieldSchema.type}" found in schema. Falling back to z.any().`);
    typeStringFunc = () => "z.any()";
  } else {
    typeStringFunc = pbSchemaZodMap[fieldSchema.type]!;
  }
  const fieldName = sanitizeFieldName(fieldSchema.name);
  let zodString: string;
  if (typeof typeStringFunc === 'function' && typeStringFunc.length > 0) {
    zodString = (typeStringFunc as (fieldSchema: PocketBaseField, collectionName: string) => string)(fieldSchema, collectionName);
  } else {
    zodString = (typeStringFunc as () => string)();
  }

  if (fieldSchema.type === 'json' && !fieldSchema.required) {
    zodString += '.nullable()';
  }

  if (!fieldSchema.required) {
    zodString += '.optional()';
  }
  return `\t${fieldName}: ${zodString},`;
}

export function createSelectOptions(recordName: string, fields: PocketBaseField[]): string {
    const selectFields = fields.filter(
        (field) => field.type === 'select' && (field.values?.length || field.options?.values?.length),
    );
    
    if (selectFields.length === 0) {
        return '';
    }
    
    const typestring = selectFields
        .map((field) => {
            const values = getOptionValues(field);
            const enumName = getOptionEnumName(recordName, field.name);
            return `export const ${enumName} = ${JSON.stringify(values)} as const;`;
        })
        .join('\n\n');

    return typestring;
}