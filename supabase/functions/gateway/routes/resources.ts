import { Hono } from 'hono';
import { getDb } from '../lib/db.ts';
import { ResourceType } from '../types/dto.ts';
import type { OAuthConfig, TokenResponse } from '../providers/types.ts';
import { FORTNOX_RESOURCE_CONFIGS } from '../providers/fortnox/config.ts';
import { VISMA_RESOURCE_CONFIGS } from '../providers/visma/config.ts';
import { FortnoxClient } from '../providers/fortnox/client.ts';
import { VismaClient } from '../providers/visma/client.ts';
import { refreshFortnoxToken } from '../providers/fortnox/oauth.ts';
import { refreshVismaToken } from '../providers/visma/oauth.ts';

const app = new Hono();

const fortnoxClient = new FortnoxClient();
const vismaClient = new VismaClient();

const VALID_RESOURCE_TYPES = new Set(Object.values(ResourceType));

// Strip _raw field from mapped DTOs to reduce payload size
function stripRaw(obj: Record<string, unknown>): Record<string, unknown> {
  const { _raw, ...rest } = obj;
  return rest;
}

function getOAuthConfig(provider: string): OAuthConfig {
  if (provider === 'fortnox') {
    return {
      clientId: Deno.env.get('FORTNOX_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('FORTNOX_CLIENT_SECRET') ?? '',
      redirectUri: Deno.env.get('FORTNOX_REDIRECT_URI') ?? '',
    };
  }
  return {
    clientId: Deno.env.get('VISMA_CLIENT_ID') ?? '',
    clientSecret: Deno.env.get('VISMA_CLIENT_SECRET') ?? '',
    redirectUri: Deno.env.get('VISMA_REDIRECT_URI') ?? '',
  };
}

interface ResolvedConsent {
  consent: Record<string, unknown>;
  accessToken: string;
}

async function resolveConsent(tenantId: string, consentId: string): Promise<ResolvedConsent> {
  const sql = getDb();

  // Load consent
  const consentRows = await sql`
    SELECT * FROM consents WHERE id = ${consentId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (consentRows.length === 0) {
    throw { status: 404, message: 'Consent not found' };
  }

  const consent = consentRows[0];
  if (consent.status !== 1) {
    throw { status: 403, message: 'Consent is not in Accepted status' };
  }

  // Load tokens
  const tokenRows = await sql`
    SELECT * FROM consent_tokens WHERE consent_id = ${consentId} LIMIT 1
  `;
  if (tokenRows.length === 0) {
    throw { status: 401, message: 'No tokens found for this consent — complete OAuth first' };
  }

  const tokens = tokenRows[0];

  // Check expiry, auto-refresh if needed
  if (tokens.token_expires_at && new Date(tokens.token_expires_at) < new Date()) {
    if (!tokens.refresh_token) {
      throw { status: 401, message: 'Access token expired and no refresh token available' };
    }

    const config = getOAuthConfig(consent.provider as string);
    let refreshed: TokenResponse;

    if (consent.provider === 'fortnox') {
      refreshed = await refreshFortnoxToken(config, tokens.refresh_token);
    } else {
      refreshed = await refreshVismaToken(config, tokens.refresh_token);
    }

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await sql`
      UPDATE consent_tokens SET
        access_token = ${refreshed.access_token},
        refresh_token = ${refreshed.refresh_token},
        token_expires_at = ${newExpiresAt}
      WHERE consent_id = ${consentId}
    `;

    return { consent, accessToken: refreshed.access_token };
  }

  return { consent, accessToken: tokens.access_token };
}

// GET /:consentId/:resourceType — list resources
app.get('/:consentId/:resourceType', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('consentId');
  const resourceType = c.req.param('resourceType') as ResourceType;

  if (!VALID_RESOURCE_TYPES.has(resourceType)) {
    return c.json({ error: `Unknown resource type: ${resourceType}` }, 400);
  }

  let resolved: ResolvedConsent;
  try {
    resolved = await resolveConsent(tenantId, consentId);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return c.json({ error: e.message ?? 'Failed to resolve consent' }, e.status ?? 500);
  }

  const { consent, accessToken } = resolved;
  const provider = consent.provider as string;

  if (provider === 'fortnox') {
    const config = FORTNOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for fortnox` }, 400);
    }

    if (config.singleton) {
      const response = await fortnoxClient.get<Record<string, unknown>>(accessToken, config.listEndpoint);
      const data = response[config.listKey];
      const mapped = stripRaw(config.mapper(data as Record<string, unknown>));
      return c.json({ data: mapped });
    }

    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 100;

    const result = await fortnoxClient.getPage<Record<string, unknown>>(
      accessToken,
      config.listEndpoint,
      config.listKey,
      {
        page,
        pageSize,
        lastModified: c.req.query('lastModified'),
      },
    );

    const mapped = result.items.map(config.mapper).map(stripRaw);
    return c.json({
      data: mapped,
      page: result.page,
      pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    });
  }

  if (provider === 'visma') {
    const config = VISMA_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for visma` }, 400);
    }

    if (config.singleton) {
      const data = await vismaClient.get<Record<string, unknown>>(accessToken, config.listEndpoint);
      const mapped = stripRaw(config.mapper(data));
      return c.json({ data: mapped });
    }

    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 100;

    const result = await vismaClient.getPage<Record<string, unknown>>(
      accessToken,
      config.listEndpoint,
      {
        page,
        pageSize,
        modifiedSince: c.req.query('modifiedSince'),
        modifiedField: config.modifiedField,
      },
    );

    const mapped = result.items.map(config.mapper).map(stripRaw);
    return c.json({
      data: mapped,
      page: result.page,
      pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    });
  }

  return c.json({ error: `Unknown provider: ${provider}` }, 400);
});

// GET /:consentId/:resourceType/:resourceId — get single resource
app.get('/:consentId/:resourceType/:resourceId', async (c) => {
  const tenantId = c.get('tenantId');
  const consentId = c.req.param('consentId');
  const resourceType = c.req.param('resourceType') as ResourceType;
  const resourceId = c.req.param('resourceId');

  if (!VALID_RESOURCE_TYPES.has(resourceType)) {
    return c.json({ error: `Unknown resource type: ${resourceType}` }, 400);
  }

  let resolved: ResolvedConsent;
  try {
    resolved = await resolveConsent(tenantId, consentId);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return c.json({ error: e.message ?? 'Failed to resolve consent' }, e.status ?? 500);
  }

  const { consent, accessToken } = resolved;
  const provider = consent.provider as string;

  if (provider === 'fortnox') {
    const config = FORTNOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for fortnox` }, 400);
    }

    const detailPath = config.detailEndpoint.replace('{id}', resourceId);
    const response = await fortnoxClient.get<Record<string, unknown>>(accessToken, detailPath);
    const data = response[config.detailKey];
    if (!data) {
      return c.json({ error: 'Resource not found' }, 404);
    }
    const mapped = stripRaw(config.mapper(data as Record<string, unknown>));
    return c.json({ data: mapped });
  }

  if (provider === 'visma') {
    const config = VISMA_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for visma` }, 400);
    }

    const detailPath = config.detailEndpoint.replace('{id}', resourceId);
    const data = await vismaClient.get<Record<string, unknown>>(accessToken, detailPath);
    const mapped = stripRaw(config.mapper(data));
    return c.json({ data: mapped });
  }

  return c.json({ error: `Unknown provider: ${provider}` }, 400);
});

export { app as resourceRoutes };
