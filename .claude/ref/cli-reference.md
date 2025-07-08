# PocketBase Zod Generator - CLI Reference

## Installation

### Global Installation (Recommended)
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

## Command Structure

```bash
pocketbase-zod-generator [options]
```

## Options

### Input Source Options

#### API Connection
```bash
# With email/password authentication
pocketbase-zod-generator --url <url> --email <email> --password <password>

# With auth token
pocketbase-zod-generator --url <url> --token <token>
```

#### Database File
```bash
# Read directly from SQLite database
pocketbase-zod-generator --db <path>
```

#### JSON Schema File
```bash
# Use exported JSON schema
pocketbase-zod-generator --json <path>
```

#### Environment Variables
```bash
# Use .env file in current directory
pocketbase-zod-generator --env

# Use .env file in specific directory
pocketbase-zod-generator --env /path/to/directory
```

### Output Options

#### Custom Output Path
```bash
pocketbase-zod-generator --out <path>
```

### Help and Version
```bash
pocketbase-zod-generator --help
pocketbase-zod-generator --version
```

## Complete Options Reference

| Option | Short | Description | Default | Required |
|--------|-------|-------------|---------|----------|
| `--url <url>` | `-u` | PocketBase instance URL | - | With email/password or token |
| `--email <email>` | - | Admin email for authentication | - | With `--url` and `--password` |
| `--password <password>` | `-p` | Admin password for authentication | - | With `--url` and `--email` |
| `--token <token>` | `-t` | Auth token for authentication | - | With `--url` (alternative to email/password) |
| `--db <path>` | `-d` | Path to PocketBase SQLite database | - | As input source |
| `--json <path>` | `-j` | Path to JSON schema file | - | As input source |
| `--env [dir]` | - | Use environment variables | current dir | As input source |
| `--out <path>` | `-o` | Output file path | `pocketbase-zod.ts` | No |
| `--help` | - | Show help message | - | No |
| `--version` | - | Show version number | - | No |

## Usage Examples

### 1. Development Setup (Local PocketBase)
```bash
# Using environment variables (recommended)
pocketbase-zod-generator --env

# Direct connection
pocketbase-zod-generator \
  --url http://127.0.0.1:8090 \
  --email admin@example.com \
  --password your-password
```

### 2. Production Setup (Remote PocketBase)
```bash
# Using auth token (recommended for production)
pocketbase-zod-generator \
  --url https://your-pocketbase.com \
  --token your-auth-token

# Or with email/password
pocketbase-zod-generator \
  --url https://your-pocketbase.com \
  --email admin@example.com \
  --password your-password
```

### 3. Database File Access
```bash
# Read from local database file
pocketbase-zod-generator --db ./pb_data/data.db

# With custom output path
pocketbase-zod-generator \
  --db ./pb_data/data.db \
  --out ./src/types/pocketbase.ts
```

### 4. JSON Schema Export
```bash
# Use exported JSON schema
pocketbase-zod-generator --json ./schema.json

# Export schema from admin UI first, then generate
pocketbase-zod-generator \
  --json ./exported-schema.json \
  --out ./types/generated.ts
```

### 5. Custom Output Paths
```bash
# TypeScript project structure
pocketbase-zod-generator \
  --env \
  --out ./src/lib/pocketbase-types.ts

# Different file extensions
pocketbase-zod-generator \
  --env \
  --out ./types/pocketbase.d.ts
```

## Environment Variables Setup

### Create .env File
```bash
# Create .env file in your project root
cat > .env << 'EOF'
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_EMAIL=admin@example.com
PB_TYPEGEN_PASSWORD=your-password
EOF
```

### Using Auth Token
```bash
# Alternative: use auth token instead of email/password
cat > .env << 'EOF'
PB_TYPEGEN_URL=http://127.0.0.1:8090
PB_TYPEGEN_TOKEN=your-auth-token
EOF
```

### Environment Variable Reference
- `PB_TYPEGEN_URL` - PocketBase instance URL (required)
- `PB_TYPEGEN_EMAIL` - Admin email (required with password)
- `PB_TYPEGEN_PASSWORD` - Admin password (required with email)
- `PB_TYPEGEN_TOKEN` - Auth token (alternative to email/password)

## Integration with Build Tools

### NPM Scripts
```json
{
  "scripts": {
    "generate-types": "pocketbase-zod-generator --env",
    "generate-types:prod": "pocketbase-zod-generator --env --out ./dist/types/pocketbase.ts",
    "prebuild": "npm run generate-types"
  }
}
```

### Development Workflow
```bash
# Generate types during development
npm run generate-types

# Watch for changes (using nodemon)
nodemon --exec "npm run generate-types" --watch pb_data/data.db
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Generate PocketBase Types
  run: |
    echo "PB_TYPEGEN_URL=${{ secrets.PB_URL }}" > .env
    echo "PB_TYPEGEN_TOKEN=${{ secrets.PB_TOKEN }}" >> .env
    pocketbase-zod-generator --env --out ./src/types/pocketbase.ts
```

## Error Handling

### Common Errors and Solutions

#### Authentication Failed
```bash
Error authenticating: Unauthorized
```
**Solution**: Check your credentials or token in .env file

#### Missing Environment Variables
```bash
Missing PB_TYPEGEN_URL environment variable
```
**Solution**: Ensure .env file exists and contains required variables

#### Database File Not Found
```bash
Error: ENOENT: no such file or directory
```
**Solution**: Check database file path is correct

#### Permission Errors
```bash
Error: EACCES: permission denied
```
**Solution**: Check file permissions or run with appropriate privileges

### Debug Mode
```bash
# Enable verbose logging (if implemented)
DEBUG=pocketbase-zod-generator pocketbase-zod-generator --env
```

## Output Format

The CLI generates a TypeScript file with:

1. **Import statements** - Zod import
2. **Collection enum** - All collection names
3. **Type aliases** - Common types (RecordIdString, IsoDateString, etc.)
4. **System field schemas** - Base and auth system fields
5. **Select options** - Const assertions for select fields
6. **Record schemas** - Zod schemas for input data
7. **Response schemas** - Schemas with system fields
8. **TypeScript types** - Inferred from Zod schemas

### Example Output Structure
```typescript
import { z } from 'zod';

export enum Collections {
  Users = "users",
  Posts = "posts",
}

export const RecordIdString = z.string().length(15);
export const IsoDateString = z.string().datetime();

export const UsersRoleOptions = ["admin","editor"] as const;

export const UsersRecordSchema = z.object({
  email: z.string().email(),
  role: z.enum(UsersRoleOptions).optional(),
});

export const UsersResponseSchema = UsersRecordSchema.merge(AuthSystemFieldsSchema);

export type UsersRecord = z.infer<typeof UsersRecordSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
```

## Best Practices

### 1. Use Environment Variables
```bash
# Recommended approach
pocketbase-zod-generator --env
```

### 2. Version Control
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "pocketbase-zod.ts" >> .gitignore  # If generated
```

### 3. Automated Generation
```bash
# Add to package.json scripts
"postinstall": "pocketbase-zod-generator --env"
```

### 4. Type Safety
```typescript
// Use generated types in your code
import { UsersRecord, UsersResponse } from './pocketbase-zod';

const user: UsersRecord = {
  email: "user@example.com",
  role: "admin"  // TypeScript will enforce valid enum values
};
```

### 5. Schema Validation
```typescript
// Use Zod schemas for runtime validation
import { UsersRecordSchema } from './pocketbase-zod';

const validatedUser = UsersRecordSchema.parse(rawUserData);
```