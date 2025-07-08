# PocketBase Zod Generator - API Reference

## Main Entry Point

### `generateZodSchemas(options: GenerationOptions): Promise<string | undefined>`

**Location**: `src/main.ts`

Primary function for generating Zod schemas from PocketBase collections.

**Parameters**:
- `options: GenerationOptions` - Configuration object

**Returns**:
- `Promise<string | undefined>` - Generated TypeScript code string or undefined on error

**Example**:
```typescript
import { generateZodSchemas } from 'pocketbase-zod-generator';

// Generate from API
const schemas = await generateZodSchemas({
  url: 'http://127.0.0.1:8090',
  email: 'admin@example.com',
  password: 'your-password',
  out: './pocketbase-zod.ts'
});

// Generate from database
const schemas = await generateZodSchemas({
  db: './pb_data/data.db',
  out: './pocketbase-zod.ts'
});
```

## Types

### `GenerationOptions`

**Location**: `src/types.ts`

Configuration interface for schema generation.

```typescript
interface GenerationOptions {
  db?: string;           // Path to PocketBase SQLite database
  json?: string;         // Path to JSON schema file
  url?: string;          // PocketBase instance URL
  email?: string;        // Admin email (with url)
  password?: string;     // Admin password (with url)
  token?: string;        // Auth token (with url)
  env?: string | boolean; // Use environment variables
  out?: string;          // Output file path
}
```

### `PocketBaseCollection`

**Location**: `src/types.ts`

Represents a PocketBase collection schema.

```typescript
interface PocketBaseCollection {
  id: string;
  name: string;
  type: 'base' | 'auth' | 'view';
  fields: PocketBaseField[];
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
}
```

### `PocketBaseField`

**Location**: `src/types.ts`

Represents a field within a PocketBase collection.

```typescript
interface PocketBaseField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  system: boolean;
  hidden: boolean;
  presentable: boolean;
  primaryKey?: boolean;
  values?: string[];        // For select fields
  maxSelect?: number;       // For multi-select fields
  min?: number;            // For validation
  max?: number;            // For validation
  pattern?: string;        // For validation
  autogeneratePattern?: string;
  options?: {
    values?: string[];
    maxSelect?: number;
    [key: string]: any;
  };
}
```

## Schema Fetchers

### `fromDatabase(dbPath: string): Promise<PocketBaseCollection[]>`

**Location**: `src/schema-fetchers.ts`

Reads schema directly from PocketBase SQLite database.

**Parameters**:
- `dbPath: string` - Path to the SQLite database file

**Returns**:
- `Promise<PocketBaseCollection[]>` - Array of collection schemas

**Example**:
```typescript
import { fromDatabase } from 'pocketbase-zod-generator';

const collections = await fromDatabase('./pb_data/data.db');
```

### `fromJSON(path: string): Promise<PocketBaseCollection[]>`

**Location**: `src/schema-fetchers.ts`

Loads schema from JSON file exported from PocketBase admin UI.

**Parameters**:
- `path: string` - Path to JSON schema file

**Returns**:
- `Promise<PocketBaseCollection[]>` - Array of collection schemas

### `fromURLWithToken(url: string, token: string): Promise<PocketBaseCollection[]>`

**Location**: `src/schema-fetchers.ts`

Fetches schema from PocketBase API using authentication token.

**Parameters**:
- `url: string` - PocketBase instance URL
- `token: string` - Authentication token

**Returns**:
- `Promise<PocketBaseCollection[]>` - Array of collection schemas

### `fromURLWithPassword(url: string, email: string, password: string): Promise<PocketBaseCollection[]>`

**Location**: `src/schema-fetchers.ts`

Fetches schema from PocketBase API using email/password authentication.

**Parameters**:
- `url: string` - PocketBase instance URL
- `email: string` - Admin email
- `password: string` - Admin password

**Returns**:
- `Promise<PocketBaseCollection[]>` - Array of collection schemas

## Generator Functions

### `generate(results: PocketBaseCollection[]): string`

**Location**: `src/generator.ts`

Main generation function that converts PocketBase collections to TypeScript code.

**Parameters**:
- `results: PocketBaseCollection[]` - Array of collection schemas

**Returns**:
- `string` - Generated TypeScript code

### `createCollectionSchema(collectionSchemaEntry: PocketBaseCollection): string`

**Location**: `src/generator.ts`

Creates Zod schema and TypeScript types for a single collection.

**Parameters**:
- `collectionSchemaEntry: PocketBaseCollection` - Collection schema

**Returns**:
- `string` - Generated code for the collection

**Generated Output**:
- Select option constants (if applicable)
- Record schema (for input data)
- Response schema (with system fields)
- TypeScript types (inferred from Zod schemas)

## Field Processing

### `createZodField(collectionName: string, fieldSchema: PocketBaseField): string`

**Location**: `src/fields.ts`

Generates Zod schema string for a single field.

**Parameters**:
- `collectionName: string` - Name of the parent collection
- `fieldSchema: PocketBaseField` - Field schema definition

**Returns**:
- `string` - Zod field definition

### `createSelectOptions(recordName: string, fields: PocketBaseField[]): string`

**Location**: `src/fields.ts`

Creates TypeScript const assertions for select field options.

**Parameters**:
- `recordName: string` - Collection name
- `fields: PocketBaseField[]` - Array of collection fields

**Returns**:
- `string` - TypeScript const definitions for select options

**Example Output**:
```typescript
export const UsersRoleOptions = ["admin","editor","viewer"] as const;
export const PostsStatusOptions = ["draft","published","archived"] as const;
```

## Utility Functions

### `toPascalCase(str: string): string`

**Location**: `src/utils.ts`

Converts strings to PascalCase with Unicode support.

**Parameters**:
- `str: string` - Input string

**Returns**:
- `string` - PascalCase string

### `sanitizeFieldName(name: string): string`

**Location**: `src/utils.ts`

Sanitizes field names for TypeScript compatibility.

**Parameters**:
- `name: string` - Field name

**Returns**:
- `string` - Sanitized field name (quoted if necessary)

### `saveFile(outPath: string, typeString: string): Promise<void>`

**Location**: `src/utils.ts`

Writes generated code to file system.

**Parameters**:
- `outPath: string` - Output file path
- `typeString: string` - Generated TypeScript code

**Returns**:
- `Promise<void>`

### `getSystemFieldsSchema(type: string): string`

**Location**: `src/utils.ts`

Returns appropriate system fields schema name based on collection type.

**Parameters**:
- `type: string` - Collection type ('auth' or other)

**Returns**:
- `string` - Schema name ('AuthSystemFieldsSchema' or 'BaseSystemFieldsSchema')

### `getOptionEnumName(recordName: string, fieldName: string): string`

**Location**: `src/utils.ts`

Generates enum name for select field options.

**Parameters**:
- `recordName: string` - Collection name
- `fieldName: string` - Field name

**Returns**:
- `string` - Enum name (e.g., 'UsersRoleOptions')

### `getOptionValues(field: PocketBaseField): string[]`

**Location**: `src/utils.ts`

Extracts and deduplicates option values from select fields.

**Parameters**:
- `field: PocketBaseField` - Field schema

**Returns**:
- `string[]` - Array of unique option values

## Collection Utilities

### `createCollectionEnum(collectionNames: string[]): string`

**Location**: `src/collections.ts`

Creates TypeScript enum for collection names.

**Parameters**:
- `collectionNames: string[]` - Array of collection names

**Returns**:
- `string` - TypeScript enum definition

**Example Output**:
```typescript
export enum Collections {
  Users = "users",
  Posts = "posts",
  Comments = "comments",
}
```

## Field Type Mapping

### `pbSchemaZodMap: FieldTypeMap`

**Location**: `src/fields.ts`

Maps PocketBase field types to Zod schema generators.

**Supported Types**:
- `text` → `z.string()`
- `number` → `z.number()`
- `bool` → `z.boolean()`
- `email` → `z.string().email()`
- `url` → `z.string().url()`
- `date` → `IsoDateString`
- `select` → `z.enum()` or `z.array(z.enum())`
- `json` → `z.any()`
- `file` → `z.string()` or `z.array(z.string())`
- `relation` → `RecordIdString` or `z.array(RecordIdString)`
- `editor` → `HTMLString`

## Error Handling

### Authentication Errors
- Invalid credentials result in `process.exit(1)`
- Missing environment variables show helpful error messages

### Schema Processing Errors
- Unknown field types fall back to `z.any()` with console warning
- Missing configuration shows usage help

### File System Errors
- File write errors propagate as Promise rejections
- Invalid paths handled by Node.js fs module

## Environment Variables

### Required Variables
- `PB_TYPEGEN_URL` - PocketBase instance URL

### Authentication Options
**Option 1**: Token-based
- `PB_TYPEGEN_TOKEN` - Authentication token

**Option 2**: Email/password
- `PB_TYPEGEN_EMAIL` - Admin email
- `PB_TYPEGEN_PASSWORD` - Admin password

### Example .env File
```env
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=your-password
```