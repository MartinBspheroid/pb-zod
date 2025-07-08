# PocketBase Zod Generator - Field Mapping Reference

## Overview

This document details how PocketBase field types are mapped to Zod schemas and TypeScript types in the generated code.

## Field Type Mapping Table

| PocketBase Type | Zod Schema | TypeScript Type | Notes |
|-----------------|------------|-----------------|-------|
| `text` | `z.string()` | `string` | Basic text field |
| `number` | `z.number()` | `number` | Numeric values |
| `bool` | `z.boolean()` | `boolean` | Boolean values |
| `email` | `z.string().email()` | `string` | Email validation |
| `url` | `z.string().url()` | `string` | URL validation |
| `date` | `IsoDateString` | `string` | ISO date string |
| `autodate` | `IsoDateString` | `string` | Auto-generated date |
| `password` | `z.string()` | `string` | Password field |
| `select` | `z.enum(Options)` | `union` | Enum values |
| `select` (multi) | `z.array(z.enum(Options))` | `array` | Multi-select |
| `json` | `z.any()` | `any` | JSON objects |
| `file` | `z.string()` | `string` | File reference |
| `file` (multi) | `z.array(z.string())` | `string[]` | Multiple files |
| `relation` | `RecordIdString` | `string` | Single relation |
| `relation` (multi) | `z.array(RecordIdString)` | `string[]` | Multiple relations |
| `user` | `RecordIdString` | `string` | Legacy user field |
| `editor` | `HTMLString` | `string` | Rich text content |

## Detailed Field Processing

### Basic Types

#### Text Field
```typescript
// PocketBase field
{
  name: "title",
  type: "text",
  required: true
}

// Generated Zod schema
title: z.string(),
```

#### Number Field
```typescript
// PocketBase field
{
  name: "price",
  type: "number",
  required: false
}

// Generated Zod schema
price: z.number().optional(),
```

#### Boolean Field
```typescript
// PocketBase field
{
  name: "isActive",
  type: "bool",
  required: true
}

// Generated Zod schema
isActive: z.boolean(),
```

### Validation Types

#### Email Field
```typescript
// PocketBase field
{
  name: "email",
  type: "email",
  required: true
}

// Generated Zod schema
email: z.string().email(),
```

#### URL Field
```typescript
// PocketBase field
{
  name: "website",
  type: "url",
  required: false
}

// Generated Zod schema
website: z.string().url().optional(),
```

### Date/Time Fields

#### Date Field
```typescript
// PocketBase field
{
  name: "createdAt",
  type: "date",
  required: true
}

// Generated Zod schema
createdAt: IsoDateString,

// Where IsoDateString is defined as:
export const IsoDateString = z.string().datetime();
```

#### Auto Date Field
```typescript
// PocketBase field
{
  name: "updatedAt",
  type: "autodate",
  required: true
}

// Generated Zod schema
updatedAt: IsoDateString,
```

### Select Fields

#### Single Select
```typescript
// PocketBase field
{
  name: "status",
  type: "select",
  required: true,
  options: {
    values: ["draft", "published", "archived"]
  }
}

// Generated constants
export const PostsStatusOptions = ["draft","published","archived"] as const;

// Generated Zod schema
status: z.enum(PostsStatusOptions),
```

#### Multi Select
```typescript
// PocketBase field
{
  name: "tags",
  type: "select",
  required: false,
  options: {
    values: ["tech", "news", "blog"],
    maxSelect: 3
  }
}

// Generated constants
export const PostsTagsOptions = ["tech","news","blog"] as const;

// Generated Zod schema
tags: z.array(z.enum(PostsTagsOptions)).optional(),
```

### File Fields

#### Single File
```typescript
// PocketBase field
{
  name: "avatar",
  type: "file",
  required: false
}

// Generated Zod schema
avatar: z.string().optional(),
```

#### Multiple Files
```typescript
// PocketBase field
{
  name: "attachments",
  type: "file",
  required: false,
  options: {
    maxSelect: 5
  }
}

// Generated Zod schema
attachments: z.array(z.string()).optional(),
```

### Relation Fields

#### Single Relation
```typescript
// PocketBase field
{
  name: "author",
  type: "relation",
  required: true,
  options: {
    maxSelect: 1
  }
}

// Generated Zod schema
author: RecordIdString,

// Where RecordIdString is defined as:
export const RecordIdString = z.string().length(15);
```

#### Multiple Relations
```typescript
// PocketBase field
{
  name: "categories",
  type: "relation",
  required: false,
  options: {
    maxSelect: 10
  }
}

// Generated Zod schema
categories: z.array(RecordIdString).optional(),
```

### Special Fields

#### JSON Field
```typescript
// PocketBase field
{
  name: "metadata",
  type: "json",
  required: false
}

// Generated Zod schema
metadata: z.any().nullable().optional(),
```

#### Editor Field
```typescript
// PocketBase field
{
  name: "content",
  type: "editor",
  required: true
}

// Generated Zod schema
content: HTMLString,

// Where HTMLString is defined as:
export const HTMLString = z.string();
```

## Field Modifiers

### Required vs Optional

#### Required Field
```typescript
// PocketBase field
{
  name: "title",
  type: "text",
  required: true
}

// Generated Zod schema
title: z.string(),
```

#### Optional Field
```typescript
// PocketBase field
{
  name: "description",
  type: "text",
  required: false
}

// Generated Zod schema
description: z.string().optional(),
```

### Special JSON Handling

JSON fields receive special treatment with nullable modifier:

```typescript
// PocketBase field
{
  name: "settings",
  type: "json",
  required: false
}

// Generated Zod schema
settings: z.any().nullable().optional(),
```

## Field Name Sanitization

### Numeric Field Names
```typescript
// PocketBase field name: "123field"
// Generated schema
"123field": z.string(),
```

### Hyphenated Field Names
```typescript
// PocketBase field name: "my-field"
// Generated schema
"my-field": z.string(),
```

### Valid JavaScript Identifiers
```typescript
// PocketBase field name: "validName"
// Generated schema
validName: z.string(),
```

## Select Field Options Processing

### Option Name Generation
```typescript
// Collection: "users", Field: "role"
// Generated enum name: "UsersRoleOptions"

// Collection: "blog_posts", Field: "category"
// Generated enum name: "BlogPostsCategoryOptions"
```

### Option Value Deduplication
```typescript
// PocketBase field options (with duplicates)
{
  values: ["admin", "user", "admin", "editor"]
}

// Generated constants (deduplicated)
export const UsersRoleOptions = ["admin","user","editor"] as const;
```

## System Fields

### Base Collection System Fields
```typescript
export const BaseSystemFieldsSchema = z.object({
  id: RecordIdString,
  collectionId: z.string(),
  collectionName: z.string(),
  created: IsoDateString,
  updated: IsoDateString,
  expand: z.record(z.any()).optional(),
});
```

### Auth Collection System Fields
```typescript
export const AuthSystemFieldsSchema = BaseSystemFieldsSchema.merge(z.object({
  email: z.string().email(),
  emailVisibility: z.boolean(),
  username: z.string(),
  verified: z.boolean(),
}));
```

## Generated Schema Structure

### Record Schema (Input)
```typescript
export const UsersRecordSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(UsersRoleOptions).optional(),
  avatar: z.string().optional(),
});
```

### Response Schema (With System Fields)
```typescript
export const UsersResponseSchema = UsersRecordSchema.merge(AuthSystemFieldsSchema);
```

### TypeScript Types
```typescript
export type UsersRecord = z.infer<typeof UsersRecordSchema>;
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
```

## Error Handling

### Unknown Field Types
```typescript
// Unknown field type fallback
console.log(`WARNING: unknown type "${fieldType}" found in schema. Falling back to z.any().`);

// Generated schema
unknownField: z.any(),
```

### Missing Select Options
```typescript
// Select field without options
{
  name: "status",
  type: "select",
  options: {} // No values array
}

// Result: No enum constants generated, field skipped in processing
```

## Validation Rules

### String Length
```typescript
// RecordIdString validation
export const RecordIdString = z.string().length(15);
```

### Email Validation
```typescript
// Email field validation
email: z.string().email(),
```

### URL Validation
```typescript
// URL field validation
website: z.string().url(),
```

### DateTime Validation
```typescript
// ISO datetime validation
export const IsoDateString = z.string().datetime();
```

## Best Practices

### 1. Use Generated Types
```typescript
import { UsersRecord, UsersResponse } from './pocketbase-zod';

// Type-safe record creation
const user: UsersRecord = {
  email: "user@example.com",
  name: "John Doe",
  role: "admin" // TypeScript enforces valid enum values
};
```

### 2. Runtime Validation
```typescript
import { UsersRecordSchema } from './pocketbase-zod';

// Validate incoming data
const validatedUser = UsersRecordSchema.parse(rawUserData);
```

### 3. Partial Updates
```typescript
// Use partial schemas for updates
const updateSchema = UsersRecordSchema.partial();
const partialUser = updateSchema.parse(updateData);
```

### 4. Custom Validation
```typescript
// Extend generated schemas
const ExtendedUserSchema = UsersRecordSchema.extend({
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});
```