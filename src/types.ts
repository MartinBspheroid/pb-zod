export interface PocketBaseCollection {
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

export interface PocketBaseField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  system: boolean;
  hidden: boolean;
  presentable: boolean;
  primaryKey?: boolean;
  values?: string[];
  maxSelect?: number;
  min?: number;
  max?: number;
  pattern?: string;
  autogeneratePattern?: string;
  options?: {
    values?: string[];
    maxSelect?: number;
    [key: string]: any;
  };
}

export interface GenerationOptions {
  db?: string;
  json?: string;
  url?: string;
  email?: string;
  password?: string;
  token?: string;
  env?: string | boolean;
  out?: string;
}

export interface SchemaFetcher {
  (options: Partial<GenerationOptions>): Promise<PocketBaseCollection[]>;
}

export type FieldTypeMapper = (fieldSchema: PocketBaseField, collectionName: string) => string;

export interface FieldTypeMap {
  [fieldType: string]: FieldTypeMapper | (() => string);
}