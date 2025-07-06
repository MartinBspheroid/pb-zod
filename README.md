# PocketBase Zod Generator

Generate Zod schemas from PocketBase collections with proper select field enum support.

[![npm version](https://badge.fury.io/js/pocketbase-zod-generator.svg)](https://badge.fury.io/js/pocketbase-zod-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🎯 Complete Zod Schema Generation**: Converts PocketBase collections into fully typed Zod schemas
- **🔗 Enum Support**: Properly handles select fields with enum constants for type safety
- **🔄 Multiple Input Sources**: Supports API endpoints, SQLite databases, and JSON files
- **🛡️ Type Safety**: Full TypeScript support with proper type definitions
- **📦 Easy Integration**: Works seamlessly with existing PocketBase projects

## 🚀 Installation

### Global Installation (Recommended for CLI usage)
```bash
npm install -g pocketbase-zod-generator
```

### Local Installation
```bash
npm install pocketbase-zod-generator
# or
yarn add pocketbase-zod-generator
# or
pnpm add pocketbase-zod-generator
```

## 📖 Usage

### CLI Usage

#### Using Environment Variables (Recommended)
Create a `.env` file in your project root:
```env
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=your-password
# OR use a token instead of email/password
PB_TYPEGEN_TOKEN=your-auth-token
```

Then run:
```bash
pocketbase-zod-generator --env
```

#### Direct API Connection
```bash
# With email/password
pocketbase-zod-generator --url http://127.0.0.1:8090 --email admin@example.com --password your-password

# With auth token
pocketbase-zod-generator --url http://127.0.0.1:8090 --token your-auth-token
```

#### From Local Database
```bash
pocketbase-zod-generator --db ./pb_data/data.db
```

#### From JSON Export
```bash
pocketbase-zod-generator --json ./schema.json
```

#### Custom Output Path
```bash
pocketbase-zod-generator --env --out ./src/lib/pocketbase-types.ts
```

### Programmatic Usage

```typescript
import { generateZodSchemas } from 'pocketbase-zod-generator';

// Generate schemas from API
const schemas = await generateZodSchemas({
  url: 'http://127.0.0.1:8090',
  email: 'admin@example.com',
  password: 'your-password',
  out: './pocketbase-zod.ts'
});

// Generate from database file
const schemas = await generateZodSchemas({
  db: './pb_data/data.db',
  out: './pocketbase-zod.ts'
});

// Generate from JSON
const schemas = await generateZodSchemas({
  json: './schema.json',
  out: './pocketbase-zod.ts'
});
```

## 📋 Generated Schema Example

Given a PocketBase collection with select fields, the generator creates:

```typescript
// Enum constants for select fields
export const UsersRoleOptions = ["admin","editor","viewer"] as const;
export const PostsStatusOptions = ["draft","published","archived"] as const;

// Zod schemas
export const UsersRecordSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(UsersRoleOptions).optional(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  created: IsoDateString.optional(),
  updated: IsoDateString.optional(),
});

export const UsersResponseSchema = UsersRecordSchema.merge(AuthSystemFieldsSchema);

// TypeScript types
export type UsersRecord = z.infer<typeof UsersRecordSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
```

## ⚙️ Binding Generation Process

Below is a diagram illustrating the process of generating Zod schemas from PocketBase collections:

```mermaid
graph TD
    A[User Input] --> B{Choose Input Type};
    B -- URL + Credentials --> C[fromURLWithPassword / fromURLWithToken];
    B -- DB Path --> D[fromDatabase];
    B -- JSON Path --> E[fromJSON];
    B -- .env File --> F[dotenv + fromURLWithPassword / fromURLWithToken];

    subgraph Schema Fetching
        direction LR
        C[schema-fetchers.ts: fromURL...] --> G[PocketBaseCollection[]];
        D[schema-fetchers.ts: fromDatabase] --> G;
        E[schema-fetchers.ts: fromJSON] --> G;
        F[dotenv + schema-fetchers.ts: fromURL...] --> G;
    end

    G --> H{generator.ts: generate};

    subgraph Code Generation
        direction TB
        H -- Iterates Collections --> I[generator.ts: createCollectionSchema];
        I -- For Each Collection --> J[fields.ts: createSelectOptions];
        I -- For Each Collection --> K[fields.ts: createZodField (for each field)];
        I -- For Each Collection --> L[Merge with System Fields (constants.ts)];
        I -- For Each Collection --> M[Infer TypeScript Types];
        J --> N[Generated Code String];
        K --> N;
        L --> N;
        M --> N;
    end

    H --> N;
    N --> O[utils.ts: saveFile];
    O --> P[Output File (e.g., pocketbase-zod.ts)];

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#f9f,stroke:#333,stroke-width:2px
    style P fill:#ccf,stroke:#333,stroke-width:2px

    classDef schemaFetcher fill:#lightgreen,stroke:#333,stroke-width:2px;
    class C,D,E,F schemaFetcher;

    classDef generator fill:#lightblue,stroke:#333,stroke-width:2px;
    class H,I,J,K,L,M generator;
```

**Brief Explanation:**

1.  **User Input**: The process starts with the user providing input, which can be PocketBase instance details (URL, credentials), a path to a local SQLite database, a JSON schema file, or by using environment variables.
2.  **Schema Fetching**: Based on the input type, the relevant function from `src/schema-fetchers.ts` is used to retrieve the collection definitions from PocketBase. This results in an array of `PocketBaseCollection` objects.
3.  **Code Generation (`generator.ts`):**
    *   The `generate` function takes the fetched schemas.
    *   It iterates through each collection, calling `createCollectionSchema`.
    *   `createCollectionSchema` then:
        *   Generates enum constants for `select` fields using `createSelectOptions` (from `src/fields.ts`).
        *   Creates Zod schema definitions for each field within a collection using `createZodField` (from `src/fields.ts`).
        *   Merges the generated record schema with appropriate system field schemas (e.g., `id`, `created`, `updated`) defined in `src/constants.ts`.
        *   Infers TypeScript types from the Zod schemas.
    *   All these generated pieces are combined into a single TypeScript code string.
4.  **Output**: The `saveFile` utility (from `src/utils.ts`) writes this code string to the specified output file (e.g., `pocketbase-zod.ts`).

## 🔧 CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--env [dir]` | Use environment variables from .env file | - |
| `--url <url>` | PocketBase instance URL | - |
| `--email <email>` | Admin email (use with --url) | - |
| `--password <password>` | Admin password (use with --url) | - |
| `--token <token>` | Auth token (use with --url) | - |
| `--db <path>` | Path to PocketBase SQLite database | - |
| `--json <path>` | Path to exported JSON schema | - |
| `--out <path>` | Output file path | `pocketbase-zod.ts` |
| `--help` | Show help | - |
| `--version` | Show version | - |

## 🌟 Key Features

### Select Field Enum Support
Unlike other generators, this tool properly handles PocketBase select fields by creating typed enum constants:

```typescript
// Before: Generic string type
status: z.string().optional()

// After: Properly typed enum
status: z.enum(PostsStatusOptions).optional()
```

### Comprehensive Field Type Support
- ✅ Text, Number, Boolean
- ✅ Email, URL validation
- ✅ Date/DateTime with proper ISO string typing
- ✅ Select fields with enum generation
- ✅ File uploads (single/multiple)
- ✅ Relations (single/multiple)
- ✅ JSON fields
- ✅ Rich text (Editor)
- ✅ Auto-generated fields

### Multiple Data Sources
- **API Connection**: Direct connection to running PocketBase instance
- **Database File**: Read directly from SQLite database
- **JSON Export**: Use schema exported from PocketBase admin UI

## 🤝 Attribution

This project builds upon the excellent work of [pocketbase-typegen](https://github.com/patmood/pocketbase-typegen) by @patmood. The core schema processing logic and PocketBase integration patterns are adapted from that project.

**Key improvements in this project:**
- ✨ Added proper Zod schema generation (vs TypeScript interfaces)
- 🔗 Fixed select field enum support with proper API fetching
- 🛡️ Added comprehensive TypeScript types
- 🔧 Improved error handling and validation

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🐛 Issues & Contributing

Found a bug or want to contribute? Please visit our [GitHub repository](https://github.com/martinblasko/pocketbase-zod-generator).

## 🔗 Related Projects

- [PocketBase](https://pocketbase.io/) - Open Source backend in 1 file
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [pocketbase-typegen](https://github.com/patmood/pocketbase-typegen) - Original TypeScript interface generator