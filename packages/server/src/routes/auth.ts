import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import {
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

function fortnoxRoutes(fortnoxOAuth?: FortnoxOAuthConfig) {
  const app = new Hono();

  // Guard: all fortnox routes return 501 if no config
  app.use('*', async (c, next) => {
    if (!fortnoxOAuth) {
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

function vismaRoutes(vismaOAuth?: VismaOAuthConfig) {
  const app = new Hono();

  // Guard: all visma routes return 501 if no config
  app.use('*', async (c, next) => {
    if (!vismaOAuth) {
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

export function authRoutes(logger: Logger, fortnoxOAuth?: FortnoxOAuthConfig, vismaOAuth?: VismaOAuthConfig) {
  const app = new Hono();

  app.route('/fortnox', fortnoxRoutes(fortnoxOAuth));
  app.route('/visma', vismaRoutes(vismaOAuth));

  return app;
}
