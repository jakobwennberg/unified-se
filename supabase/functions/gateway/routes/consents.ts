import { Hono } from 'hono';
import { getDb } from '../lib/db.ts';

const app = new Hono();

// GET /api/v1/consents — list consents for tenant
app.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const sql = getDb();

  const rows = await sql`
    SELECT id, tenant_id, name, status, provider, org_number, company_name,
           system_settings_id, etag, created_at, updated_at, expires_at
    FROM consents
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `;

  return c.json({ data: rows });
});

// GET /api/v1/consents/:id — get single consent
app.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('id');
  const sql = getDb();

  const rows = await sql`
    SELECT id, tenant_id, name, status, provider, org_number, company_name,
           system_settings_id, etag, created_at, updated_at, expires_at
    FROM consents
    WHERE id = ${consentId} AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  return c.json(rows[0], 200, { 'ETag': rows[0].etag });
});

// POST /api/v1/consents — create consent
app.post('/', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json();
  const sql = getDb();

  const { name, provider, orgNumber, companyName, systemSettingsId } = body;
  if (!name || !provider) {
    return c.json({ error: 'name and provider are required' }, 400);
  }

  if (!['fortnox', 'visma', 'briox'].includes(provider)) {
    return c.json({ error: 'provider must be fortnox, visma, or briox' }, 400);
  }

  const id = crypto.randomUUID();
  const etag = crypto.randomUUID();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO consents (id, tenant_id, name, status, provider, org_number, company_name, system_settings_id, etag, created_at, updated_at)
    VALUES (${id}, ${tenantId}, ${name}, 0, ${provider}, ${orgNumber ?? null}, ${companyName ?? null}, ${systemSettingsId ?? null}, ${etag}, ${now}, ${now})
  `;

  const rows = await sql`SELECT * FROM consents WHERE id = ${id}`;
  return c.json(rows[0], 201);
});

// PATCH /api/v1/consents/:id — update consent
app.patch('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('id');
  const body = await c.req.json();
  const sql = getDb();

  // Check ETag for optimistic concurrency
  const ifMatch = c.req.header('If-Match');
  const existing = await sql`
    SELECT etag FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId} LIMIT 1
  `;

  if (existing.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  if (ifMatch && ifMatch !== existing[0].etag) {
    return c.json({ error: 'ETag mismatch — consent was modified' }, 412);
  }

  const newEtag = crypto.randomUUID();
  const now = new Date().toISOString();

  await sql`
    UPDATE consents SET
      name = COALESCE(${body.name ?? null}, name),
      status = COALESCE(${body.status ?? null}, status),
      provider = COALESCE(${body.provider ?? null}, provider),
      org_number = COALESCE(${body.orgNumber ?? null}, org_number),
      company_name = COALESCE(${body.companyName ?? null}, company_name),
      system_settings_id = COALESCE(${body.systemSettingsId ?? null}, system_settings_id),
      etag = ${newEtag},
      updated_at = ${now}
    WHERE id = ${consentId} AND tenant_id = ${tenantId}
  `;

  const rows = await sql`SELECT * FROM consents WHERE id = ${consentId}`;
  return c.json(rows[0], 200, { 'ETag': newEtag });
});

// DELETE /api/v1/consents/:id — delete consent
app.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('id');
  const sql = getDb();

  // Delete related records first
  await sql`DELETE FROM consent_tokens WHERE consent_id = ${consentId}`;
  await sql`DELETE FROM one_time_codes WHERE consent_id = ${consentId}`;
  await sql`DELETE FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId}`;

  return c.json({ success: true });
});

// POST /api/v1/consents/:id/otc — generate one-time code
app.post('/:id/otc', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('id');
  const sql = getDb();

  const consent = await sql`
    SELECT id FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (consent.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  const code = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO one_time_codes (code, consent_id, expires_at)
    VALUES (${code}, ${consentId}, ${expiresAt})
  `;

  return c.json({ code, expiresAt });
});

// POST /api/v1/consents/validate-code — validate one-time code
app.post('/validate-code', async (c) => {
  const body = await c.req.json();
  const { code } = body;
  if (!code) {
    return c.json({ error: 'code is required' }, 400);
  }

  const sql = getDb();
  const rows = await sql`
    SELECT otc.code, otc.consent_id, otc.expires_at, otc.used_at,
           c.provider, c.name as consent_name
    FROM one_time_codes otc
    JOIN consents c ON c.id = otc.consent_id
    WHERE otc.code = ${code}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return c.json({ error: 'Invalid code' }, 404);
  }

  const otc = rows[0];

  if (otc.used_at) {
    return c.json({ error: 'Code already used' }, 410);
  }

  if (new Date(otc.expires_at) < new Date()) {
    return c.json({ error: 'Code expired' }, 410);
  }

  // Mark as used
  const now = new Date().toISOString();
  await sql`UPDATE one_time_codes SET used_at = ${now} WHERE code = ${code}`;

  return c.json({
    consentId: otc.consent_id,
    provider: otc.provider,
    consentName: otc.consent_name,
  });
});

export { app as consentRoutes };
