import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ============================================
// CONNECTIONS
// ============================================
export const connections = sqliteTable('connections', {
  connectionId: text('connection_id').primaryKey(),
  provider: text('provider').notNull(),
  displayName: text('display_name').notNull(),
  organizationNumber: text('organization_number'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

// ============================================
// ENTITY RECORDS
// ============================================
export const entityRecords = sqliteTable(
  'entity_records',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    connectionId: text('connection_id').notNull(),
    entityType: text('entity_type').notNull(),
    externalId: text('external_id').notNull(),
    provider: text('provider').notNull(),
    fiscalYear: integer('fiscal_year'),
    documentDate: text('document_date'),
    dueDate: text('due_date'),
    counterpartyNumber: text('counterparty_number'),
    counterpartyName: text('counterparty_name'),
    amount: real('amount'),
    currency: text('currency').notNull().default('SEK'),
    status: text('status'),
    rawData: text('raw_data', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    lastModified: text('last_modified'),
    contentHash: text('content_hash').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('entity_records_unique').on(
      table.connectionId,
      table.entityType,
      table.externalId,
    ),
    index('entity_records_connection').on(table.connectionId),
    index('entity_records_connection_type').on(table.connectionId, table.entityType),
    index('entity_records_document_date').on(table.documentDate),
    index('entity_records_connection_type_fy').on(
      table.connectionId,
      table.entityType,
      table.fiscalYear,
    ),
  ],
);

// ============================================
// SYNC STATE
// ============================================
export const syncState = sqliteTable(
  'sync_state',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    connectionId: text('connection_id').notNull(),
    entityType: text('entity_type').notNull(),
    lastSyncAt: text('last_sync_at'),
    lastModifiedCursor: text('last_modified_cursor'),
    recordsFetched: integer('records_fetched').notNull().default(0),
    recordsUpdated: integer('records_updated').notNull().default(0),
    lastError: text('last_error'),
    lastErrorAt: text('last_error_at'),
  },
  (table) => [
    uniqueIndex('sync_state_unique').on(table.connectionId, table.entityType),
  ],
);

// ============================================
// SYNC PROGRESS
// ============================================
export const syncProgress = sqliteTable('sync_progress', {
  jobId: text('job_id').primaryKey(),
  connectionId: text('connection_id').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull(),
  progress: integer('progress').notNull().default(0),
  entityResults: text('entity_results', { mode: 'json' }).notNull().$type<unknown[]>(),
  sieResult: text('sie_result', { mode: 'json' }).$type<Record<string, unknown>>(),
  error: text('error'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  totalDurationMs: integer('total_duration_ms'),
});

// ============================================
// SIE UPLOADS
// ============================================
export const sieUploads = sqliteTable(
  'sie_uploads',
  {
    uploadId: text('upload_id').primaryKey(),
    connectionId: text('connection_id').notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    sieType: integer('sie_type').notNull(),
    fileName: text('file_name'),
    accountCount: integer('account_count').notNull().default(0),
    transactionCount: integer('transaction_count').notNull().default(0),
    uploadedAt: text('uploaded_at').notNull(),
  },
  (table) => [
    uniqueIndex('sie_uploads_unique').on(
      table.connectionId,
      table.fiscalYear,
      table.sieType,
    ),
  ],
);

// ============================================
// SIE DATA
// ============================================
export const sieData = sqliteTable('sie_data', {
  uploadId: text('upload_id').primaryKey(),
  connectionId: text('connection_id').notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  sieType: integer('sie_type').notNull(),
  parsed: text('parsed', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  kpis: text('kpis', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  rawContent: text('raw_content'),
});

// ============================================
// CONSENTS
// ============================================
export const consents = sqliteTable('consents', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  status: integer('status').notNull().default(0),
  provider: text('provider').notNull(),
  orgNumber: text('org_number'),
  companyName: text('company_name'),
  systemSettingsId: text('system_settings_id'),
  etag: text('etag').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  expiresAt: text('expires_at'),
}, (table) => [
  index('consents_tenant').on(table.tenantId),
  index('consents_tenant_provider').on(table.tenantId, table.provider),
]);

// ============================================
// CONSENT TOKENS
// ============================================
export const consentTokens = sqliteTable('consent_tokens', {
  consentId: text('consent_id').primaryKey(),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  scopes: text('scopes'),
  encryptedAt: text('encrypted_at'),
});

// ============================================
// ONE-TIME CODES
// ============================================
export const oneTimeCodes = sqliteTable('one_time_codes', {
  code: text('code').primaryKey(),
  consentId: text('consent_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
}, (table) => [
  index('otc_consent').on(table.consentId),
]);
