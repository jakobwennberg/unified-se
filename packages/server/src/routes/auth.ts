import { Hono } from 'hono';
import type { Context } from 'hono';
import type { DatabaseAdapter, Logger, TokenEncryption } from '@arcim-sync/core';
import {
  ConsentStatus,
  buildFortnoxAuthUrl,
  exchangeFortnoxCode,
  refreshFortnoxToken,
  revokeFortnoxToken,
  buildVismaAuthUrl,
  exchangeVismaCode,
  refreshVismaToken,
  revokeVismaToken,
} from '@arcim-sync/core';
import type { FortnoxOAuthConfig, VismaOAuthConfig } from '../types.js';
import {
  FortnoxUrlQuery, FortnoxExchangeBody, FortnoxRefreshBody, FortnoxRevokeBody,
  VismaUrlQuery, VismaExchangeBody, VismaRefreshBody, VismaRevokeBody,
} from '../schemas.js';

interface CallbackDeps {
  db?: DatabaseAdapter;
  logger: Logger;
  tokenEncryption?: TokenEncryption;
}

type OAuthConfig = { clientId: string; clientSecret: string; redirectUri: string };

async function handleCallback(
  provider: string,
  oauthConfig: OAuthConfig | undefined,
  exchangeFn: (config: OAuthConfig, code: string) => Promise<{ access_token: string; refresh_token: string; expires_in: number }>,
  deps: CallbackDeps,
  c: Context,
) {
  if (!deps.db) {
    return c.json({ error: 'Database not configured for auth callbacks' }, 501);
  }
  if (!oauthConfig) {
    return c.json({ error: `${provider} OAuth not configured` }, 501);
  }

  const body = await c.req.json();
  const { code, consentId } = body;
  if (!code || !consentId) {
    return c.json({ error: 'code and consentId are required' }, 400);
  }

  const consent = await deps.db.getConsent(consentId);
  if (!consent) {
    return c.json({ error: 'Consent not found' }, 404);
  }
  if (consent.provider !== provider) {
    return c.json({ error: `Consent provider mismatch: expected ${consent.provider}, got ${provider}` }, 400);
  }

  const tokens = await exchangeFn(oauthConfig, code);

  let accessToken = tokens.access_token;
  let refreshToken = tokens.refresh_token;
  if (deps.tokenEncryption) {
    accessToken = deps.tokenEncryption.encrypt(accessToken);
    if (refreshToken) {
      refreshToken = deps.tokenEncryption.encrypt(refreshToken);
    }
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await deps.db.storeConsentTokens({
    consentId,
    provider,
    accessToken,
    refreshToken,
    tokenExpiresAt: expiresAt,
  });

  await deps.db.upsertConsent({
    ...consent,
    status: ConsentStatus.Accepted,
    etag: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });

  deps.logger.info('OAuth callback: tokens stored, consent accepted', { consentId, provider });
  return c.json({ success: true, consentId });
}

function fortnoxRoutes(fortnoxOAuth: FortnoxOAuthConfig | undefined, deps: CallbackDeps) {
  const app = new Hono();

  // Guard: all fortnox routes return 501 if no config (except callback which checks itself)
  app.use('*', async (c, next) => {
    if (!fortnoxOAuth && c.req.path !== '/callback') {
      return c.json({ error: 'Fortnox OAuth not configured' }, 501);
    }
    return next();
  });

  // GET /auth/fortnox/url
  app.get('/url', (c) => {
    const query = FortnoxUrlQuery.safeParse({
      redirectUri: c.req.query('redirectUri') || undefined,
      scopes: c.req.query('scopes') || undefined,
      state: c.req.query('state') || undefined,
    });

    const config = fortnoxOAuth!;
    const effectiveConfig = query.success && query.data.redirectUri
      ? { ...config, redirectUri: query.data.redirectUri }
      : config;

    const scopes = query.success && query.data.scopes
      ? query.data.scopes.split(',').map((s) => s.trim())
      : undefined;
    const state = query.success ? query.data.state : undefined;

    const url = buildFortnoxAuthUrl(effectiveConfig, { scopes, state });
    return c.json({ url });
  });

  // POST /auth/fortnox/callback — exchange code + store tokens for a consent
  app.post('/callback', (c) =>
    handleCallback('fortnox', fortnoxOAuth, exchangeFortnoxCode, deps, c),
  );

  // POST /auth/fortnox/exchange
  app.post('/exchange', async (c) => {
    const raw = await c.req.json();
    const parsed = FortnoxExchangeBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const result = await exchangeFortnoxCode(fortnoxOAuth!, parsed.data.code);
    return c.json(result);
  });

  // POST /auth/fortnox/refresh
  app.post('/refresh', async (c) => {
    const raw = await c.req.json();
    const parsed = FortnoxRefreshBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const result = await refreshFortnoxToken(fortnoxOAuth!, parsed.data.refreshToken);
    return c.json(result);
  });

  // POST /auth/fortnox/revoke
  app.post('/revoke', async (c) => {
    const raw = await c.req.json();
    const parsed = FortnoxRevokeBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const revoked = await revokeFortnoxToken(fortnoxOAuth!, parsed.data.refreshToken);
    return c.json({ revoked });
  });

  return app;
}

function vismaRoutes(vismaOAuth: VismaOAuthConfig | undefined, deps: CallbackDeps) {
  const app = new Hono();

  // Guard: all visma routes return 501 if no config (except callback which checks itself)
  app.use('*', async (c, next) => {
    if (!vismaOAuth && c.req.path !== '/callback') {
      return c.json({ error: 'Visma OAuth not configured' }, 501);
    }
    return next();
  });

  // GET /auth/visma/url
  app.get('/url', (c) => {
    const query = VismaUrlQuery.safeParse({
      redirectUri: c.req.query('redirectUri') || undefined,
      scopes: c.req.query('scopes') || undefined,
      state: c.req.query('state') || undefined,
      acrValues: c.req.query('acrValues') || undefined,
    });

    const config = vismaOAuth!;
    const effectiveConfig = query.success && query.data.redirectUri
      ? { ...config, redirectUri: query.data.redirectUri }
      : config;

    const scopes = query.success && query.data.scopes
      ? query.data.scopes.split(',').map((s) => s.trim())
      : undefined;
    const state = query.success ? query.data.state : undefined;
    const acrValues = query.success ? query.data.acrValues : undefined;

    const url = buildVismaAuthUrl(effectiveConfig, { scopes, state, acrValues });
    return c.json({ url });
  });

  // POST /auth/visma/callback — exchange code + store tokens for a consent
  app.post('/callback', (c) =>
    handleCallback('visma', vismaOAuth, exchangeVismaCode, deps, c),
  );

  // POST /auth/visma/exchange
  app.post('/exchange', async (c) => {
    const raw = await c.req.json();
    const parsed = VismaExchangeBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const result = await exchangeVismaCode(vismaOAuth!, parsed.data.code);
    return c.json(result);
  });

  // POST /auth/visma/refresh
  app.post('/refresh', async (c) => {
    const raw = await c.req.json();
    const parsed = VismaRefreshBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const result = await refreshVismaToken(vismaOAuth!, parsed.data.refreshToken);
    return c.json(result);
  });

  // POST /auth/visma/revoke
  app.post('/revoke', async (c) => {
    const raw = await c.req.json();
    const parsed = VismaRevokeBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const revoked = await revokeVismaToken(vismaOAuth!, parsed.data.refreshToken);
    return c.json({ revoked });
  });

  return app;
}

export function authRoutes(logger: Logger, fortnoxOAuth?: FortnoxOAuthConfig, vismaOAuth?: VismaOAuthConfig, db?: DatabaseAdapter, tokenEncryption?: TokenEncryption) {
  const app = new Hono();
  const deps: CallbackDeps = { db, logger, tokenEncryption };

  app.route('/fortnox', fortnoxRoutes(fortnoxOAuth, deps));
  app.route('/visma', vismaRoutes(vismaOAuth, deps));

  return app;
}
