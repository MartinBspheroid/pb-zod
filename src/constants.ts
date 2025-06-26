export const EXPORT_COMMENT = `/**
* This file was @generated using pocketbase-typegen
*/`;

export const IMPORTS = `import { z } from 'zod'`;

export const GENERATED_FROM_URL_COMMENT = (url: string) => `// Generated from: ${url}`;
export const GENERATION_TIMESTAMP_COMMENT = (timestamp: string) => `// Generated at: ${timestamp}`;

export const SCHEMAS_COMMENT = `// ===== ZOD SCHEMAS =====`;

export const INFERRED_TYPES_COMMENT = `// ===== INFERRED TYPES =====`;

export const RESPONSE_TYPE_COMMENT = `// Response types include system fields and match responses from the PocketBase API`;

export const ALIAS_DEFINITIONS_COMMENT = `// Alias types for improved usability`;

export const RECORD_ID_STRING_NAME = `RecordIdString`;

export const ISO_DATE_STRING_NAME = `IsoDateString`;

export const HTML_STRING_NAME = `HTMLString`;

export const ALIAS_TYPE_DEFINITIONS = `
export const ${RECORD_ID_STRING_NAME} = z.string().length(15)
export const ${ISO_DATE_STRING_NAME} = z.string().datetime()
export const ${HTML_STRING_NAME} = z.string()`;

export const BASE_SYSTEM_FIELDS_SCHEMA = `export const BaseSystemFieldsSchema = z.object({
	id: ${RECORD_ID_STRING_NAME},
	collectionId: z.string(),
	collectionName: z.string(),
	created: ${ISO_DATE_STRING_NAME},
	updated: ${ISO_DATE_STRING_NAME},
	expand: z.record(z.any()).optional(),
})`;

export const AUTH_SYSTEM_FIELDS_SCHEMA = `export const AuthSystemFieldsSchema = BaseSystemFieldsSchema.merge(z.object({
	email: z.string().email(),
	emailVisibility: z.boolean(),
	username: z.string(),
	verified: z.boolean(),
}))`;