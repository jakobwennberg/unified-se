import type { MiddlewareHandler } from 'hono';
import { getDb } from '../lib/db.ts';

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const apiKey = header.replace(/^Bearer\s+/i, '');
  if (!apiKey) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  const keyHash = await hashApiKey(apiKey);
  const sql = getDb();

  // Check api_keys table first (multi-key support), then fall back to tenants table
  const keyRows = await sql`
    SELECT ak.tenant_id, t.name, t.email, t.plan, t.rate_limit_per_minute, t.rate_limit_per_day, t.max_consents
    FROM api_keys ak
    JOIN tenants t ON t.id = ak.tenant_id
    WHERE ak.key_hash = ${keyHash}
      AND ak.revoked_at IS NULL
      AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    LIMIT 1
  `;

  if (keyRows.length > 0) {
    const row = keyRows[0];
    c.set('tenantId', row.tenant_id);
    c.set('tenant', row);
    return next();
  }

  // Fallback: check legacy api_key_hash on tenants table
  const tenantRows = await sql`
    SELECT id, name, email, plan, rate_limit_per_minute, rate_limit_per_day, max_consents
    FROM tenants
    WHERE api_key_hash = ${keyHash}
    LIMIT 1
  `;

  if (tenantRows.length === 0) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  const tenant = tenantRows[0];
  c.set('tenantId', tenant.id);
  c.set('tenant', tenant);

  await next();
};
