export const APP_SCHEMA_VERSION = '0068';

export const DATABASE_SCHEMA_VERSION_KEY = 'database.schema.version';
export const LEGACY_DATABASE_SCHEMA_VERSION_KEY = 'settings.database.schema.version';
export const DATABASE_SCHEMA_APP_VERSION_KEY = 'database.schema.appVersion';
export const DATABASE_SCHEMA_COOKIE_KEY = 'database.schema.sqliteVersion';

export * from './appSchemaCoreTables.js';
export * from './appSchemaFeatureTables.js';

export * from './appSchemaSbvOfficeTables.js';
