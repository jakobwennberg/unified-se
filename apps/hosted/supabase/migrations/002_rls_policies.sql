-- Row Level Security policies for multi-tenant isolation
-- These require the tenant_id to be set via the JWT or session context

-- Enable RLS on all tenant-scoped tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_codes ENABLE ROW LEVEL SECURITY;

-- Connections: tenant can only see their own
CREATE POLICY connections_tenant_isolation ON connections
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Consents: tenant can only see their own
CREATE POLICY consents_tenant_isolation ON consents
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Consent tokens: accessible only through consent ownership
CREATE POLICY consent_tokens_isolation ON consent_tokens
  FOR ALL
  USING (
    consent_id IN (
      SELECT id FROM consents
      WHERE tenant_id = current_setting('app.tenant_id', true)
    )
  );

-- One-time codes: accessible only through consent ownership
CREATE POLICY otc_isolation ON one_time_codes
  FOR ALL
  USING (
    consent_id IN (
      SELECT id FROM consents
      WHERE tenant_id = current_setting('app.tenant_id', true)
    )
  );
