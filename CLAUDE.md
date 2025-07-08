# PocketBase Zod Generator - Development Reference

## Project Overview

**pocketbase-zod-generator** is a TypeScript CLI tool that generates Zod schemas from PocketBase collections with proper select field enum support. It provides type-safe validation and TypeScript types for PocketBase applications.

## Quick Start

```bash
# Install globally
npm install -g pocketbase-zod-generator

# Generate schemas from local PocketBase
pocketbase-zod-generator --env --out ./src/types/pocketbase-zod.ts
```

## Documentation

### Core References
- **[Architecture Overview](.claude/ref/architecture.md)** - System design, patterns, and data flow
- **[API Reference](.claude/ref/api-reference.md)** - Complete function and type documentation
- **[CLI Reference](.claude/ref/cli-reference.md)** - Command-line usage and options
- **[Field Mapping](.claude/ref/field-mapping.md)** - PocketBase to Zod type conversions

### Key Files
- `src/main.ts` - Primary API entry point
- `src/cli.ts` - Command-line interface
- `src/generator.ts` - Core generation logic
- `src/schema-fetchers.ts` - Data source strategies
- `src/fields.ts` - Field type mapping
- `src/types.ts` - TypeScript definitions

## Development Commands

```bash
# Build the project
npm run build

# Development mode
npm run dev

# Test the CLI locally
tsx src/cli.ts --help
```

## Environment Setup

Create `.env` file:
```env
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=your-password
```

## Generated Output Structure

The tool generates TypeScript files with:
1. Collection enums
2. Select field option constants
3. Zod record schemas (for input)
4. Zod response schemas (with system fields)
5. Inferred TypeScript types

## Key Features

- **Multiple Input Sources**: API, SQLite database, JSON export
- **Type Safety**: Full TypeScript support with Zod validation
- **Enum Support**: Proper select field handling with const assertions
- **System Fields**: Separate handling for base vs auth collections
- **Extensible**: Easy to add new field types and sources

## Common Tasks

### Adding New Field Types
1. Add type mapping in `src/fields.ts` → `pbSchemaZodMap`
2. Add constants in `src/constants.ts` if needed
3. Update documentation in `.claude/ref/field-mapping.md`

### Adding New Schema Sources
1. Create fetcher function in `src/schema-fetchers.ts`
2. Add to main orchestration in `src/main.ts`
3. Add CLI option in `src/cli.ts`

### Modifying Generated Output
1. Update templates in `src/constants.ts`
2. Modify generation logic in `src/generator.ts`
3. Test with various PocketBase schemas

## Testing

Currently uses manual testing approach:
1. Set up local PocketBase instance
2. Create test collections with various field types
3. Run generator and verify output
4. Test generated schemas with real data

## Build and Release

```bash
# Build for production
npm run build

# Publish to npm
npm publish
```

## Dependencies

- **Runtime**: `commander`, `cross-fetch`, `dotenv-flow`, `sqlite3`
- **Peer**: `zod` (required for generated schemas)
- **Development**: TypeScript tooling

## Architecture Patterns

- **Strategy Pattern**: Multiple schema fetchers
- **Factory Pattern**: Field type mapping
- **Template Method**: Code generation
- **Facade Pattern**: Main API abstraction