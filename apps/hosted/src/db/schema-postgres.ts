import { pgTable, text, integer, real, uniqueIndex, index, timestamp, boolean, serial, pgSchema } from 'drizzle-orm/pg-core';

// ============================================
// TENANTS
// ============================================
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  apiKeyHash: text('api_key_hash').notNull(),
  authUserId: text('auth_user_id'),
  plan: text('plan').notNull().default('free'),
  rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(60),
  rateLimitPerDay: integer('rate_limit_per_day').notNull().default(10000),
  maxConsents: integer('max_consents').notNull().default(25),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================
// CONNECTIONS (with tenant_id)
// ============================================
export const connections = pgTable('connections', {
  connectionId: text('connection_id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  provider: text('provider').notNull(),
  displayName: text('display_name').notNull(),
  organizationNumber: text('organization_number'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  metadata: text('metadata'),
}, (table) => [
  index('connections_tenant').on(table.tenantId),
]);

// ============================================
// CONSENTS (with tenant_id)
// ============================================
export const consents = pgTable('consents', {
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
export const consentTokens = pgTable('consent_tokens', {
  consentId: text('consent_id').primaryKey(),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),
  scopes: text('scopes'),
  encryptedAt: text('encrypted_at'),
});

// ============================================
// API KEYS (multiple per tenant)
// ============================================
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull().default('Default'),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  encryptedKey: text('encrypted_key'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
}, (table) => [
  index('api_keys_tenant').on(table.tenantId),
]);

// ============================================
// ONE-TIME CODES
// ============================================
export const oneTimeCodes = pgTable('one_time_codes', {
  code: text('code').primaryKey(),
  consentId: text('consent_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
}, (table) => [
  index('otc_consent').on(table.consentId),
]);
