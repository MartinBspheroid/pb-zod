# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pocketbase-zod-generator** is a TypeScript CLI tool that generates Zod schemas from PocketBase collections with proper select field enum support. It provides type-safe validation and TypeScript types for PocketBase applications.

## Development Commands

```bash
# Build the project (compiles TypeScript to dist/)
npm run build

# Development mode (run CLI without building)
npm run dev

# Test the CLI locally with tsx
tsx src/cli.ts --help

# Clean build artifacts
npm run clean

# Prepare for publishing (clean + build)
npm run prepublishOnly
```

**Note**: The project currently has placeholder commands for `npm run test`, `npm run lint`, and `npm run format` that don't perform actual operations yet.

## Project Architecture

### Core Data Flow
The tool follows a multi-source data collection → schema generation → file output pattern:

1. **Schema Collection** (`src/schema-fetchers.ts`): Multiple strategies to fetch PocketBase collection schemas:
   - `fromURLWithPassword`: API connection with admin credentials  
   - `fromURLWithToken`: API connection with auth token
   - `fromDatabase`: Direct SQLite database reading
   - `fromJSON`: JSON file import
   - Environment variable support via `dotenv-flow`

2. **Generation Pipeline** (`src/generator.ts`): 
   - `generate()`: Main orchestration function
   - `createCollectionSchema()`: Per-collection schema generation
   - Produces enum constants, record schemas, response schemas, and TypeScript types

3. **Field Mapping** (`src/fields.ts`): Converts PocketBase field types to Zod schema definitions with proper type safety

### Key Architecture Files
- `src/main.ts` - Primary API entry point and orchestration
- `src/generator.ts` - Core generation logic and template assembly  
- `src/schema-fetchers.ts` - Data source abstraction strategies
- `src/fields.ts` - PocketBase to Zod field type mapping
- `src/types.ts` - TypeScript interfaces for the entire system
- `src/constants.ts` - Code generation templates and system field definitions
- `src/utils.ts` - File operations and utility functions
- `src/cli.ts` - Command-line interface implementation

### Generated Output Structure
Each collection produces:
1. Select field enum constants (e.g., `UsersRoleOptions`)
2. Record schema for input validation (`UsersRecordSchema`) 
3. Response schema with system fields (`UsersResponseSchema`)
4. Inferred TypeScript types (`UsersRecord`, `UsersResponse`)

### System Field Handling
Collections are categorized as `base`, `auth`, or `view` types, each receiving appropriate system fields (id, created, updated, etc.) merged from predefined schemas in `src/constants.ts`.

## Environment Setup

Create `.env` file for development:
```env
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=your-password
# OR use token instead
PB_TYPEGEN_TOKEN=your-auth-token
```

## Common Development Tasks

### Adding New Field Types
1. Add type mapping in `src/fields.ts` → `pbSchemaZodMap` function
2. Add any new constants to `src/constants.ts` 
3. Test with PocketBase collections containing the new field type

### Adding New Schema Sources  
1. Create new fetcher function in `src/schema-fetchers.ts`
2. Add to main orchestration logic in `src/main.ts` → `generateZodSchemas()`
3. Add CLI option in `src/cli.ts` using `commander` package

### Modifying Generated Output
1. Update string templates in `src/constants.ts`
2. Modify generation logic in `src/generator.ts` → `createCollectionSchema()`
3. Test output with various PocketBase schema configurations

## Testing Approach

Manual testing process (no automated test suite yet):
1. Set up local PocketBase instance with test data
2. Create collections with various field types (text, select, relation, etc.)
3. Run generator: `tsx src/cli.ts --env --out test-output.ts`
4. Verify generated schemas compile and validate correctly

## TypeScript Configuration

- Uses ES modules (`"type": "module"` in package.json)
- Two TypeScript configs:
  - `tsconfig.json`: Development with bundler module resolution
  - `tsconfig.build.json`: Production build with Node module resolution
- Build outputs to `dist/` with declaration files

## Dependencies

- **CLI**: `commander` for argument parsing
- **HTTP**: `cross-fetch` for API requests  
- **Database**: `sqlite3` + `sqlite` wrapper for direct DB access
- **Environment**: `dotenv-flow` for .env file support
- **Forms**: `form-data` for authentication requests
- **Peer**: `zod` (required by generated schemas)

## Build and Publishing

```bash
# Clean build
npm run clean && npm run build

# Publish to npm (runs prepublishOnly hook)
npm publish
```