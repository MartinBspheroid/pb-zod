/**
* This file was @generated using pocketbase-typegen
*/

import { z } from 'zod'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Chips = "chips",
	Couplings = "couplings",
	TestCollection = "test_collection",
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

// Zod schemas for each collection

export const AuthoriginsRecordSchema = z.object({
	collectionRef: z.string(),
	created: IsoDateString.optional(),
	fingerprint: z.string(),
	id: z.string(),
	recordRef: z.string(),
	updated: IsoDateString.optional(),
});

export const AuthoriginsResponseSchema = AuthoriginsRecordSchema.merge(BaseSystemFieldsSchema);

export type AuthoriginsRecord = z.infer<typeof AuthoriginsRecordSchema>;

export type AuthoriginsResponse = z.infer<typeof AuthoriginsResponseSchema>;

export const ExternalauthsRecordSchema = z.object({
	collectionRef: z.string(),
	created: IsoDateString.optional(),
	id: z.string(),
	provider: z.string(),
	providerId: z.string(),
	recordRef: z.string(),
	updated: IsoDateString.optional(),
});

export const ExternalauthsResponseSchema = ExternalauthsRecordSchema.merge(BaseSystemFieldsSchema);

export type ExternalauthsRecord = z.infer<typeof ExternalauthsRecordSchema>;

export type ExternalauthsResponse = z.infer<typeof ExternalauthsResponseSchema>;

export const MfasRecordSchema = z.object({
	collectionRef: z.string(),
	created: IsoDateString.optional(),
	id: z.string(),
	method: z.string(),
	recordRef: z.string(),
	updated: IsoDateString.optional(),
});

export const MfasResponseSchema = MfasRecordSchema.merge(BaseSystemFieldsSchema);

export type MfasRecord = z.infer<typeof MfasRecordSchema>;

export type MfasResponse = z.infer<typeof MfasResponseSchema>;

export const OtpsRecordSchema = z.object({
	collectionRef: z.string(),
	created: IsoDateString.optional(),
	id: z.string(),
	password: z.string(),
	recordRef: z.string(),
	sentTo: z.string().optional(),
	updated: IsoDateString.optional(),
});

export const OtpsResponseSchema = OtpsRecordSchema.merge(BaseSystemFieldsSchema);

export type OtpsRecord = z.infer<typeof OtpsRecordSchema>;

export type OtpsResponse = z.infer<typeof OtpsResponseSchema>;

export const SuperusersRecordSchema = z.object({
	created: IsoDateString.optional(),
	email: z.string().email(),
	emailVisibility: z.boolean().optional(),
	id: z.string(),
	password: z.string(),
	tokenKey: z.string(),
	updated: IsoDateString.optional(),
	verified: z.boolean().optional(),
});

export const SuperusersResponseSchema = SuperusersRecordSchema.merge(AuthSystemFieldsSchema);

export type SuperusersRecord = z.infer<typeof SuperusersRecordSchema>;

export type SuperusersResponse = z.infer<typeof SuperusersResponseSchema>;

export const ChipsRecordSchema = z.object({
	created: IsoDateString.optional(),
	height: z.number().optional(),
	id: z.string(),
	max_input_voltage: z.number().optional(),
	max_temp: z.number().optional(),
	min_input_voltage: z.number().optional(),
	min_temp: z.number().optional(),
	name: z.string().optional(),
	num_pins: z.number().optional(),
	updated: IsoDateString.optional(),
	width: z.number().optional(),
});

export const ChipsResponseSchema = ChipsRecordSchema.merge(BaseSystemFieldsSchema);

export type ChipsRecord = z.infer<typeof ChipsRecordSchema>;

export type ChipsResponse = z.infer<typeof ChipsResponseSchema>;

export const CouplingsRecordSchema = z.object({
	application: z.string().optional(),
	caps: z.boolean().optional(),
	catalogue: z.string().url(),
	created: IsoDateString.optional(),
	description: HTMLString.optional(),
	diameter: z.number(),
	full_name: z.string().optional(),
	id: z.string(),
	material: z.string(),
	max_pressure: z.number(),
	max_temperature: z.number(),
	medium: z.string(),
	min_pressure: z.number(),
	min_temperature: z.number(),
	name: z.string(),
	repairkit: z.boolean().optional(),
	seals: z.string().optional(),
	type: z.string(),
	updated: IsoDateString.optional(),
	usage: z.string().optional(),
	valved: z.boolean().optional(),
});

export const CouplingsResponseSchema = CouplingsRecordSchema.merge(BaseSystemFieldsSchema);

export type CouplingsRecord = z.infer<typeof CouplingsRecordSchema>;

export type CouplingsResponse = z.infer<typeof CouplingsResponseSchema>;

export const TestCollectionOptionsOptions = ["A","B","C","D"] as const;

export const TestCollectionRecordSchema = z.object({
	bool: z.boolean().optional(),
	created: IsoDateString.optional(),
	id: z.string(),
	number: z.number().optional(),
	options: z.enum(TestCollectionOptionsOptions).optional(),
	text: z.string().optional(),
	updated: IsoDateString.optional(),
});

export const TestCollectionResponseSchema = TestCollectionRecordSchema.merge(BaseSystemFieldsSchema);

export type TestCollectionRecord = z.infer<typeof TestCollectionRecordSchema>;

export type TestCollectionResponse = z.infer<typeof TestCollectionResponseSchema>;

export const UsersRoleOptions = ["sales","editor","admin"] as const;

export const UsersRecordSchema = z.object({
	avatar: z.string().optional(),
	created: IsoDateString.optional(),
	email: z.string().email(),
	emailVisibility: z.boolean().optional(),
	id: z.string(),
	name: z.string().optional(),
	password: z.string(),
	role: z.enum(UsersRoleOptions).optional(),
	tokenKey: z.string(),
	updated: IsoDateString.optional(),
	verified: z.boolean().optional(),
});

export const UsersResponseSchema = UsersRecordSchema.merge(AuthSystemFieldsSchema);

export type UsersRecord = z.infer<typeof UsersRecordSchema>;

export type UsersResponse = z.infer<typeof UsersResponseSchema>;
