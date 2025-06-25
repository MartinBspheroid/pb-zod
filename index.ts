#!/usr/bin/env node

// src/cli.ts
import dotenv from "dotenv-flow";

// src/schema.ts
import FormData from "form-data";
import fetch from "cross-fetch";
import { promises as fs } from "fs";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function fromDatabase(dbPath: string) {
  const db = await open({
    driver: sqlite3.Database,
    filename: dbPath
  });
  const result = await db.all("SELECT * FROM _collections");
  return result.map((collection) => ({
    ...collection,
    fields: JSON.parse(collection.fields ?? collection.schema ?? "{}")
  }));
}
async function fromJSON(path: string) {
  const schemaStr = await fs.readFile(path, { encoding: "utf8" });
  return JSON.parse(schemaStr);
}
async function fromURLWithToken(url: string, token: string = "") {
  let collections = [];
  try {
    // First, get the list of collections
    const result = await fetch(`${url}/api/collections?perPage=200`, {
      headers: {
        Authorization: token
      }
    }).then((res) => {
      if (!res.ok) throw res;
      return res.json();
    });
    
    
    // Then, fetch detailed schema for each collection
    const detailedCollections = await Promise.all(
      result.items.map(async (collection: any) => {
        try {
          const detailedResult = await fetch(`${url}/api/collections/${collection.name}`, {
            headers: {
              Authorization: token
            }
          }).then((res) => {
            if (!res.ok) throw res;
            return res.json();
          });
          return {
            ...detailedResult,
            fields: detailedResult.fields || []
          };
        } catch (error) {
          console.error(`Error fetching detailed schema for ${collection.name}:`, error);
          // Fallback to basic collection info
          return collection;
        }
      })
    );
    
    collections = detailedCollections;
  } catch (error) {
    console.error("Error fetching schema from URL:", error);
    process.exit(1);
  }
  return collections;
}
async function fromURLWithPassword(url: string, email: string = "", password: string = "") {
  const formData = new FormData();
  formData.append("identity", email);
  formData.append("password", password);
  let token;
  try {
    const response = await fetch(
      `${url}/api/admins/auth-with-password`, // Changed to admin auth
      {
        body: formData as any,
        method: "post"
      }
    ).then((res) => {
      if (!res.ok) throw res;
      return res.json();
    });
    token = response.token;
  } catch (error: any) {
    console.error("Error authenticating:", error.statusText || error);
    process.exit(1);
  }
  return await fromURLWithToken(url, token);
}

// src/constants.ts
var EXPORT_COMMENT = `/**
* This file was @generated using pocketbase-typegen
*/`;
var IMPORTS = `import { z } from 'zod'`;
var SCHEMAS_COMMENT = `// Zod schemas for each collection`;
var RESPONSE_TYPE_COMMENT = `// Response types include system fields and match responses from the PocketBase API`;
var ALIAS_DEFINITIONS_COMMENT = `// Alias types for improved usability`;
var RECORD_ID_STRING_NAME = `RecordIdString`;
var ISO_DATE_STRING_NAME = `IsoDateString`;
var HTML_STRING_NAME = `HTMLString`;

var ALIAS_TYPE_DEFINITIONS = `
export const ${RECORD_ID_STRING_NAME} = z.string().length(15)
export const ${ISO_DATE_STRING_NAME} = z.string().datetime()
export const ${HTML_STRING_NAME} = z.string()`;

var BASE_SYSTEM_FIELDS_SCHEMA = `export const BaseSystemFieldsSchema = z.object({
	id: ${RECORD_ID_STRING_NAME},
	collectionId: z.string(),
	collectionName: z.string(),
	created: ${ISO_DATE_STRING_NAME},
	updated: ${ISO_DATE_STRING_NAME},
	expand: z.record(z.any()).optional(),
})`;

var AUTH_SYSTEM_FIELDS_SCHEMA = `export const AuthSystemFieldsSchema = BaseSystemFieldsSchema.merge(z.object({
	email: z.string().email(),
	emailVisibility: z.boolean(),
	username: z.string(),
	verified: z.boolean(),
}))`;


// src/utils.ts
import { promises as fs2 } from "fs";
function toPascalCase(str: string): string {
  if (/^[\p{L}\d]+$/iu.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str.replace(
    /([\p{L}\d])([\p{L}\d]*)/giu,
    (_g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()
  ).replace(/[^\p{L}\d]/giu, "");
}
function sanitizeFieldName(name: string): string {
  return !isNaN(parseFloat(name.charAt(0))) || name.includes('-') ? `"${name}"` : name;
}
async function saveFile(outPath: string, typeString: string): Promise<void> {
  await fs2.writeFile(outPath, typeString, "utf8");
  console.log(`Created Zod schemas at ${outPath}`);
}
function getSystemFieldsSchema(type: string): string {
  switch (type) {
    case "auth":
      return "AuthSystemFieldsSchema";
    default:
      return "BaseSystemFieldsSchema";
  }
}
function getOptionEnumName(recordName: string, fieldName: string): string {
  return `${toPascalCase(recordName)}${toPascalCase(fieldName)}Options`;
}
function getOptionValues(field: any): string[] {
  const values = field.values || field.options?.values;
  if (!values) return [];
  return values.filter((val: any, i: number) => values.indexOf(val) === i);
}

// src/collections.ts
function createCollectionEnum(collectionNames: string[]): string {
  const collections = collectionNames.map((name) => `	${toPascalCase(name)} = "${name}",`).join("\n");
  const typeString = `export enum Collections {
${collections}
}`;
  return typeString;
}

// src/fields.ts
const pbSchemaZodMap = {
    text: () => `z.string()`,
    number: () => `z.number()`,
    bool: () => `z.boolean()`,
    email: () => `z.string().email()`,
    url: () => `z.string().url()`,
    date: () => ISO_DATE_STRING_NAME,
    autodate: () => ISO_DATE_STRING_NAME,
    password: () => `z.string()`,
    select: (fieldSchema: any, collectionName: any) => {
        const optionName = getOptionEnumName(collectionName, fieldSchema.name);
        const baseEnum = `z.enum(${optionName})`;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${baseEnum})`
            : baseEnum;
    },
    json: () => `z.any()`,
    file: (fieldSchema: any) => {
        const base = `z.string()`;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${base})`
            : base;
    },
    relation: (fieldSchema: any) => {
        const base = RECORD_ID_STRING_NAME;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect === 1
            ? base
            : `z.array(${base})`;
    },
    user: (fieldSchema: any) => { // Deprecated but handle gracefully
        const base = RECORD_ID_STRING_NAME;
        const maxSelect = fieldSchema.maxSelect || fieldSchema.options?.maxSelect;
        return maxSelect && maxSelect > 1
            ? `z.array(${base})`
            : base;
    },
    editor: () => HTML_STRING_NAME,
};


function createZodField(collectionName: string, fieldSchema: any): string {
  let typeStringFunc;
  if (!(fieldSchema.type in pbSchemaZodMap)) {
    console.log(`WARNING: unknown type "${fieldSchema.type}" found in schema. Falling back to z.any().`);
    typeStringFunc = () => "z.any()";
  } else {
    typeStringFunc = (pbSchemaZodMap as any)[fieldSchema.type];
  }
  const fieldName = sanitizeFieldName(fieldSchema.name);
  let zodString = typeStringFunc(fieldSchema, collectionName);

  if (fieldSchema.type === 'json' && !fieldSchema.required) {
    zodString += '.nullable()';
  }

  if (!fieldSchema.required) {
    zodString += '.optional()';
  }
  return `\t${fieldName}: ${zodString},`;
}

function createSelectOptions(recordName: string, fields: any[]): string {
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

// src/lib.ts
function generate(results: any[]): string {
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

function createCollectionSchema(collectionSchemaEntry: any): string {
    const { name, fields, type } = collectionSchemaEntry;
    const pascalName = toPascalCase(name);

    // 1. Generate select option consts
    const selectOptions = createSelectOptions(name, fields);

    // 2. Generate the base record schema
    const zodFields = fields
        .map((fieldSchema: any) => createZodField(name, fieldSchema))
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


// src/cli.ts
async function main(options: any): Promise<string | undefined> {
  let schema;
  if (options.db) {
    schema = await fromDatabase(options.db);
  } else if (options.json) {
    schema = await fromJSON(options.json);
  } else if (options.url && options.token) {
    schema = await fromURLWithToken(options.url, options.token);
  } else if (options.url) {
    schema = await fromURLWithPassword(
      options.url,
      options.email,
      options.password
    );
  } else if (options.env) {
    dotenv.config(
      typeof options.env === "string" ? { path: options.env } : void 0
    );
    if (!process.env.PB_TYPEGEN_URL) {
      console.error("Missing PB_TYPEGEN_URL environment variable");
      return;
    }
    if (process.env.PB_TYPEGEN_TOKEN) {
      schema = await fromURLWithToken(
        process.env.PB_TYPEGEN_URL,
        process.env.PB_TYPEGEN_TOKEN
      );
    } else if (process.env.PB_TYPEGEN_EMAIL && process.env.PB_TYPEGEN_PASSWORD) {
      schema = await fromURLWithPassword(
        process.env.PB_TYPEGEN_URL,
        process.env.PB_TYPEGEN_EMAIL,
        process.env.PB_TYPEGEN_PASSWORD
      );
    } else {
      console.error(
        "Missing PB_TYPEGEN_EMAIL/PB_TYPEGEN_PASSWORD or PB_TYPEGEN_TOKEN environment variables"
      );
      return;
    }
  } else {
    console.error(
      "Missing schema path. Check options: pocketbase-zod-gen --help"
    );
    return;
  }
  const typeString = generate(schema);
  await saveFile(options.out, typeString);
  return typeString;
}

// src/index.ts
import { program } from "commander";

// package.json - hardcoded for simplicity
var version = "1.0.0";

// src/index.ts
program.name("Pocketbase Zodgen").version(version).description(
  "CLI to create Zod schemas for your pocketbase.io records."
).option(
  "-u, --url <url>",
  "URL to your hosted pocketbase instance. Must provide email/password or an auth token."
).option(
  "--email <email>",
  "Email for a pocketbase admin. Use with --url."
).option(
  "-p, --password <password>",
  "Password for a pocketbase admin. Use with --url."
).option(
  "-t, --token <token>",
  "Auth token for a pocketbase admin. Use with --url."
).option("-d, --db <path>", "Path to the pocketbase SQLite database.").option(
  "-j, --json <path>",
  "Path to JSON schema exported from pocketbase admin UI."
).option(
  "--env [dir]",
  "Use environment variables for configuration. Add PB_TYPEGEN_URL, PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD to your .env file. Optionally provide a path to a directory containing a .env file.",
  true
).option(
  "-o, --out <path>",
  "Path to save the Zod schema output file.",
  "pocketbase-zod.ts"
);
program.parse(process.argv);
var options = program.opts();
main(options);