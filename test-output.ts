// Generated from: local JSON file: ./schema.json

// Generated at: 2025-06-26T05:41:01.539Z

/**
* This file was @generated using pocketbase-typegen
*/

import { z } from 'zod'

export enum Collections {
	Users = "users",
}

// Alias types for improved usability


export const RecordIdString = z.string().length(15)
export const IsoDateString = z.string().datetime()
export const HTMLString = z.string()

export const BaseSystemFieldsSchema = z.object({
	id: RecordIdString,
	collectionId: z.string(),
	collectionName: z.string(),
	created: IsoDateString,
	updated: IsoDateString,
	expand: z.record(z.any()).optional(),
})

export const AuthSystemFieldsSchema = BaseSystemFieldsSchema.merge(z.object({
	email: z.string().email(),
	emailVisibility: z.boolean(),
	username: z.string(),
	verified: z.boolean(),
}))

// ===== ZOD SCHEMAS =====

export const UsersRoleOptions = ["admin","editor","viewer"] as const;

export const UsersRecordSchema = z.object({
	avatar: z.string().optional(),
	name: z.string().optional(),
	role: z.enum(UsersRoleOptions).optional(),
});

export const UsersResponseSchema = UsersRecordSchema.merge(AuthSystemFieldsSchema);

// ===== INFERRED TYPES =====

export type UsersRecord = z.infer<typeof UsersRecordSchema>;

export type UsersResponse = z.infer<typeof UsersResponseSchema>;
