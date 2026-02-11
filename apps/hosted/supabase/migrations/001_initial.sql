-- Arcim Sync Hosted: Initial Schema
-- Multi-tenant tables with RLS support

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  max_consents INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
  connection_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  organization_number TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS connections_tenant ON connections (tenant_id);

-- ============================================
-- CONSENTS
-- ============================================
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  org_number TEXT,
  company_name TEXT,
  system_settings_id TEXT,
  etag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS consents_tenant ON consents (tenant_id);
CREATE INDEX IF NOT EXISTS consents_tenant_provider ON consents (tenant_id, provider);

-- ============================================
-- CONSENT TOKENS (encrypted at rest)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_tokens (
  consent_id TEXT PRIMARY KEY REFERENCES consents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  encrypted_at TIMESTAMPTZ
);

-- ============================================
-- ONE-TIME CODES
-- ============================================
CREATE TABLE IF NOT EXISTS one_time_codes (
  code TEXT PRIMARY KEY,
  consent_id TEXT NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS otc_consent ON one_time_codes (consent_id);
