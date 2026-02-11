import { Hono } from 'hono';
import { getDb } from '../lib/db.ts';
import type { OAuthConfig, TokenResponse } from '../providers/types.ts';
import { buildFortnoxAuthUrl, exchangeFortnoxCode, refreshFortnoxToken, revokeFortnoxToken } from '../providers/fortnox/oauth.ts';
import { buildVismaAuthUrl, exchangeVismaCode, refreshVismaToken, revokeVismaToken } from '../providers/visma/oauth.ts';
import { exchangeBrioxCode, refreshBrioxToken } from '../providers/briox/oauth.ts';
import { storeBokioToken } from '../providers/bokio/oauth.ts';
import { storeBjornLundenToken, refreshBjornLundenToken } from '../providers/bjornlunden/oauth.ts';

const app = new Hono();

function getOAuthConfig(provider: string): OAuthConfig {
  if (provider === 'fortnox') {
    return {
      clientId: Deno.env.get('FORTNOX_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('FORTNOX_CLIENT_SECRET') ?? '',
      redirectUri: Deno.env.get('FORTNOX_REDIRECT_URI') ?? '',
    };
  }
  if (provider === 'visma') {
    return {
      clientId: Deno.env.get('VISMA_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('VISMA_CLIENT_SECRET') ?? '',
      redirectUri: Deno.env.get('VISMA_REDIRECT_URI') ?? '',
    };
  }
  if (provider === 'briox') {
    return {
      clientId: Deno.env.get('BRIOX_CLIENT_ID') ?? '',
      clientSecret: '',
      redirectUri: '',
    };
  }
  if (provider === 'bokio') {
    return {
      clientId: '',
      clientSecret: '',
      redirectUri: '',
    };
  }
  if (provider === 'bjornlunden') {
    return {
      clientId: Deno.env.get('BJORN_LUNDEN_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('BJORN_LUNDEN_CLIENT_SECRET') ?? '',
      redirectUri: '',
    };
  }
  throw new Error(`Unknown provider: ${provider}`);
}

function validateProvider(provider: string): boolean {
  return provider === 'fortnox' || provider === 'visma' || provider === 'briox' || provider === 'bokio' || provider === 'bjornlunden';
}

// GET /api/v1/auth/:provider/url — get OAuth authorization URL
app.get('/:provider/url', async (c) => {
  const provider = c.req.param('provider');
  if (!validateProvider(provider)) {
    return c.json({ error: `Unsupported provider: ${provider}` }, 400);
  }

  if (provider === 'briox') {
    return c.json({ error: 'Briox uses application tokens, not OAuth. Use the callback endpoint with an application token.' }, 400);
  }

  if (provider === 'bokio') {
    return c.json({ error: 'Bokio uses private API tokens, not OAuth. Use the callback endpoint with an API token and company ID.' }, 400);
  }

  if (provider === 'bjornlunden') {
    return c.json({ error: 'Björn Lunden uses client credentials. Use the callback endpoint with a company key.' }, 400);
  }

  const config = getOAuthConfig(provider);
  const scopes = c.req.query('scopes')?.split(',');
  const state = c.req.query('state');

  let url: string;
  if (provider === 'fortnox') {
    url = buildFortnoxAuthUrl(config, { scopes, state });
  } else {
    url = buildVismaAuthUrl(config, { scopes, state });
  }

  return c.json({ url });
});

// POST /api/v1/auth/:provider/exchange — exchange code for tokens (returns tokens)
app.post('/:provider/exchange', async (c) => {
  const provider = c.req.param('provider');
  if (!validateProvider(provider)) {
    return c.json({ error: `Unsupported provider: ${provider}` }, 400);
  }

  const body = await c.req.json();
  const { code } = body;
  if (!code) {
    return c.json({ error: 'code is required' }, 400);
  }

  const config = getOAuthConfig(provider);
  let tokens: TokenResponse;

  if (provider === 'bokio') {
    return c.json({ error: 'Bokio uses private API tokens. Use the callback endpoint instead.' }, 400);
  }

  if (provider === 'bjornlunden') {
    return c.json({ error: 'Björn Lunden uses client credentials. Use the callback endpoint instead.' }, 400);
  }

  if (provider === 'fortnox') {
    tokens = await exchangeFortnoxCode(config, code);
  } else if (provider === 'briox') {
    tokens = await exchangeBrioxCode(config.clientId, code);
  } else {
    tokens = await exchangeVismaCode(config, code);
  }

  return c.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in,
  });
});

// POST /api/v1/auth/:provider/callback — exchange code + store tokens for a consent
app.post('/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  if (!validateProvider(provider)) {
    return c.json({ error: `Unsupported provider: ${provider}` }, 400);
  }

  const body = await c.req.json();
  const { code, consentId } = body;
  if (!code || !consentId) {
    return c.json({ error: 'code and consentId are required' }, 400);
  }

  const sql = getDb();
  const tenantId = c.get('tenantId');

  // Verify the consent belongs to this tenant
  const consentRows = await sql`
    SELECT id, provider FROM consents
    WHERE id = ${consentId} AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (consentRows.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  const consent = consentRows[0];
  if (consent.provider !== provider) {
    return c.json({ error: `Consent provider mismatch: expected ${consent.provider}, got ${provider}` }, 400);
  }

  // Exchange code for tokens (or store directly for bokio)
  let tokens: TokenResponse;

  if (provider === 'bokio') {
    // Bokio: no token exchange — store the API token directly
    const { companyId } = body;
    if (!companyId) {
      return c.json({ error: 'companyId is required for Bokio' }, 400);
    }

    tokens = storeBokioToken(code);

    // Store tokens with provider_company_id
    await sql`
      INSERT INTO consent_tokens (consent_id, provider, access_token, refresh_token, token_expires_at, provider_company_id)
      VALUES (${consentId}, ${provider}, ${tokens.access_token}, ${''}, ${null}, ${companyId})
      ON CONFLICT (consent_id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = ${''},
        token_expires_at = ${null},
        provider_company_id = ${companyId}
    `;
  } else if (provider === 'bjornlunden') {
    // Björn Lunden: client credentials grant — acquire token server-side, store company GUID
    const { companyId } = body;
    if (!companyId) {
      return c.json({ error: 'companyId is required for Björn Lunden' }, 400);
    }

    tokens = await storeBjornLundenToken();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await sql`
      INSERT INTO consent_tokens (consent_id, provider, access_token, refresh_token, token_expires_at, provider_company_id)
      VALUES (${consentId}, ${provider}, ${tokens.access_token}, ${''}, ${expiresAt}, ${companyId})
      ON CONFLICT (consent_id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = ${''},
        token_expires_at = ${expiresAt},
        provider_company_id = ${companyId}
    `;
  } else {
    const config = getOAuthConfig(provider);

    if (provider === 'fortnox') {
      tokens = await exchangeFortnoxCode(config, code);
    } else if (provider === 'briox') {
      tokens = await exchangeBrioxCode(config.clientId, code);
    } else {
      tokens = await exchangeVismaCode(config, code);
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store tokens in consent_tokens (upsert)
    await sql`
      INSERT INTO consent_tokens (consent_id, provider, access_token, refresh_token, token_expires_at)
      VALUES (${consentId}, ${provider}, ${tokens.access_token}, ${tokens.refresh_token}, ${expiresAt})
      ON CONFLICT (consent_id) DO UPDATE SET
        access_token = ${tokens.access_token},
        refresh_token = ${tokens.refresh_token},
        token_expires_at = ${expiresAt}
    `;
  }

  // Update consent status to Accepted (1)
  const now = new Date().toISOString();
  const newEtag = crypto.randomUUID();
  await sql`
    UPDATE consents SET status = 1, etag = ${newEtag}, updated_at = ${now}
    WHERE id = ${consentId}
  `;

  return c.json({ success: true, consentId });
});

// POST /api/v1/auth/:provider/refresh — manual token refresh
app.post('/:provider/refresh', async (c) => {
  const provider = c.req.param('provider');
  if (!validateProvider(provider)) {
    return c.json({ error: `Unsupported provider: ${provider}` }, 400);
  }

  const body = await c.req.json();
  const { consentId } = body;
  if (!consentId) {
    return c.json({ error: 'consentId is required' }, 400);
  }

  const sql = getDb();
  const tenantId = c.get('tenantId');

  // Verify consent
  const consentRows = await sql`
    SELECT id FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (consentRows.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  if (provider === 'bokio') {
    return c.json({ error: 'Bokio uses private API tokens that do not expire. No refresh needed.' }, 400);
  }

  if (provider === 'bjornlunden') {
    // BL uses client credentials — no refresh_token, just get a new access token
    const tokens = await refreshBjornLundenToken();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await sql`
      UPDATE consent_tokens SET
        access_token = ${tokens.access_token},
        token_expires_at = ${expiresAt}
      WHERE consent_id = ${consentId}
    `;

    return c.json({ success: true, expires_in: tokens.expires_in });
  }

  // Get current tokens
  const tokenRows = await sql`
    SELECT refresh_token FROM consent_tokens WHERE consent_id = ${consentId} LIMIT 1
  `;
  if (tokenRows.length === 0 || !tokenRows[0].refresh_token) {
    return c.json({ error: 'No refresh token found' }, 400);
  }

  const config = getOAuthConfig(provider);
  let tokens: TokenResponse;

  if (provider === 'fortnox') {
    tokens = await refreshFortnoxToken(config, tokenRows[0].refresh_token);
  } else if (provider === 'briox') {
    tokens = await refreshBrioxToken(config.clientId, tokenRows[0].refresh_token);
  } else {
    tokens = await refreshVismaToken(config, tokenRows[0].refresh_token);
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await sql`
    UPDATE consent_tokens SET
      access_token = ${tokens.access_token},
      refresh_token = ${tokens.refresh_token},
      token_expires_at = ${expiresAt}
    WHERE consent_id = ${consentId}
  `;

  return c.json({ success: true, expires_in: tokens.expires_in });
});

// POST /api/v1/auth/:provider/revoke — revoke tokens
app.post('/:provider/revoke', async (c) => {
  const provider = c.req.param('provider');
  if (!validateProvider(provider)) {
    return c.json({ error: `Unsupported provider: ${provider}` }, 400);
  }

  const body = await c.req.json();
  const { consentId } = body;
  if (!consentId) {
    return c.json({ error: 'consentId is required' }, 400);
  }

  const sql = getDb();
  const tenantId = c.get('tenantId');

  // Verify consent
  const consentRows = await sql`
    SELECT id FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (consentRows.length === 0) {
    return c.json({ error: 'Consent not found' }, 404);
  }

  // Get current tokens
  const tokenRows = await sql`
    SELECT refresh_token FROM consent_tokens WHERE consent_id = ${consentId} LIMIT 1
  `;

  if (tokenRows.length > 0 && tokenRows[0].refresh_token) {
    const config = getOAuthConfig(provider);
    if (provider === 'fortnox') {
      await revokeFortnoxToken(config, tokenRows[0].refresh_token);
    } else if (provider === 'visma') {
      await revokeVismaToken(config, tokenRows[0].refresh_token);
    }
    // Briox/Bokio: no revocation endpoint — just delete stored tokens
  }

  // Delete tokens
  await sql`DELETE FROM consent_tokens WHERE consent_id = ${consentId}`;

  // Update consent status to Revoked (2)
  const now = new Date().toISOString();
  const newEtag = crypto.randomUUID();
  await sql`
    UPDATE consents SET status = 2, etag = ${newEtag}, updated_at = ${now}
    WHERE id = ${consentId}
  `;

  return c.json({ success: true });
});

export { app as authRoutes };
