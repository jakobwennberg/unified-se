import { Hono } from 'hono';
import { getDb } from '../lib/db.ts';
import { ResourceType } from '../types/dto.ts';
import type { OAuthConfig, TokenResponse } from '../providers/types.ts';
import { FORTNOX_RESOURCE_CONFIGS } from '../providers/fortnox/config.ts';
import { VISMA_RESOURCE_CONFIGS } from '../providers/visma/config.ts';
import { BRIOX_RESOURCE_CONFIGS } from '../providers/briox/config.ts';
import { BOKIO_RESOURCE_CONFIGS } from '../providers/bokio/config.ts';
import { BL_RESOURCE_CONFIGS } from '../providers/bjornlunden/config.ts';
import { FortnoxClient } from '../providers/fortnox/client.ts';
import { VismaClient } from '../providers/visma/client.ts';
import { BrioxClient } from '../providers/briox/client.ts';
import { BokioClient } from '../providers/bokio/client.ts';
import { BjornLundenClient } from '../providers/bjornlunden/client.ts';
import { refreshFortnoxToken } from '../providers/fortnox/oauth.ts';
import { refreshVismaToken } from '../providers/visma/oauth.ts';
import { refreshBrioxToken } from '../providers/briox/oauth.ts';
import { refreshBjornLundenToken } from '../providers/bjornlunden/oauth.ts';

const app = new Hono();

const fortnoxClient = new FortnoxClient();
const vismaClient = new VismaClient();
const brioxClient = new BrioxClient();
const bokioClient = new BokioClient();
const bjornLundenClient = new BjornLundenClient();

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
  if (provider === 'briox') {
    return {
      clientId: Deno.env.get('BRIOX_CLIENT_ID') ?? '',
      clientSecret: '',
      redirectUri: '',
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
  providerCompanyId?: string;
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

  // Bokio uses private API tokens that don't expire — skip expiry check
  if (consent.provider === 'bokio') {
    return {
      consent,
      accessToken: tokens.access_token,
      providerCompanyId: tokens.provider_company_id as string | undefined,
    };
  }

  // Björn Lunden uses client credentials — auto-refresh when expired (no refresh_token)
  if (consent.provider === 'bjornlunden') {
    if (tokens.token_expires_at && new Date(tokens.token_expires_at) < new Date()) {
      const refreshed = await refreshBjornLundenToken();
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      await sql`
        UPDATE consent_tokens SET
          access_token = ${refreshed.access_token},
          token_expires_at = ${newExpiresAt}
        WHERE consent_id = ${consentId}
      `;

      return {
        consent,
        accessToken: refreshed.access_token,
        providerCompanyId: tokens.provider_company_id as string | undefined,
      };
    }

    return {
      consent,
      accessToken: tokens.access_token,
      providerCompanyId: tokens.provider_company_id as string | undefined,
    };
  }

  // Check expiry, auto-refresh if needed
  if (tokens.token_expires_at && new Date(tokens.token_expires_at) < new Date()) {
    if (!tokens.refresh_token) {
      throw { status: 401, message: 'Access token expired and no refresh token available' };
    }

    const config = getOAuthConfig(consent.provider as string);
    let refreshed: TokenResponse;

    if (consent.provider === 'fortnox') {
      refreshed = await refreshFortnoxToken(config, tokens.refresh_token);
    } else if (consent.provider === 'briox') {
      refreshed = await refreshBrioxToken(config.clientId, tokens.refresh_token);
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
    const includeEntries = c.req.query('includeEntries') === 'true';
    const financialyear = c.req.query('financialyear');

    // Forward financialyear to Fortnox list endpoint for journals
    let listEndpoint = config.listEndpoint;
    if (financialyear) {
      const sep = listEndpoint.includes('?') ? '&' : '?';
      listEndpoint = `${listEndpoint}${sep}financialyear=${financialyear}`;
    }

    const result = await fortnoxClient.getPage<Record<string, unknown>>(
      accessToken,
      listEndpoint,
      config.listKey,
      {
        page,
        pageSize,
        lastModified: c.req.query('lastModified'),
      },
    );

    // Hydrate entries by fetching detail for each voucher when requested
    if (includeEntries && config.supportsEntryHydration) {
      const hydrated = await Promise.all(
        result.items.map(async (item) => {
          try {
            const series = String(item['VoucherSeries'] ?? '');
            const number = String(item['VoucherNumber'] ?? '');
            const year = String(item['Year'] ?? financialyear ?? '');
            const fyParam = year ? `?financialyear=${year}` : '';
            const detailPath = `/vouchers/${series}/${number}${fyParam}`;
            const detailResponse = await fortnoxClient.get<Record<string, unknown>>(accessToken, detailPath);
            const detail = detailResponse[config.detailKey] as Record<string, unknown> | undefined;
            if (detail?.['VoucherRows']) {
              return { ...item, VoucherRows: detail['VoucherRows'] };
            }
          } catch {
            // Graceful degradation: return item without entries on failure
          }
          return item;
        }),
      );
      const mapped = hydrated.map(config.mapper).map(stripRaw);
      return c.json({
        data: mapped,
        page: result.page,
        pageSize,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages,
      });
    }

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

  if (provider === 'briox') {
    const config = BRIOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for briox` }, 400);
    }

    if (config.singleton) {
      const response = await brioxClient.get<{ data: Record<string, unknown> }>(accessToken, config.listEndpoint);
      const mapped = stripRaw(config.mapper(response.data));
      return c.json({ data: mapped });
    }

    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 100;

    // Journal endpoint is year-scoped — resolve financial year ID
    let listEndpoint = config.listEndpoint;
    if (config.yearScoped) {
      const fiscalYear = c.req.query('fiscalYear')
        ?? await brioxClient.getCurrentFinancialYear(accessToken);
      listEndpoint = `${config.listEndpoint}/${fiscalYear}`;
    }

    const result = await brioxClient.getPage<Record<string, unknown>>(
      accessToken,
      listEndpoint,
      config.listKey,
      {
        page,
        pageSize,
        fromModifiedDate: config.supportsModifiedFilter ? c.req.query('lastModified') : undefined,
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

  if (provider === 'bokio') {
    const config = BOKIO_RESOURCE_CONFIGS[resourceType];

    // Bokio doesn't support suppliers or supplier invoices — return empty results
    if (!config) {
      return c.json({
        data: [],
        page: 1,
        pageSize: 0,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
      });
    }

    const companyId = resolved.providerCompanyId;
    if (!companyId) {
      return c.json({ error: 'No company ID found for this Bokio consent' }, 400);
    }

    // Singleton (CompanyInformation)
    if (config.singleton) {
      const data = await bokioClient.getCompany<Record<string, unknown>>(accessToken, companyId);
      // If company-information:read scope is missing, fall back to minimal data
      const raw = data ?? { id: companyId };
      const mapped = stripRaw(config.mapper(raw) as Record<string, unknown>);
      return c.json({ data: mapped });
    }

    // Non-paginated (chart-of-accounts) — fetch full list
    if (config.paginated === false) {
      const items = await bokioClient.getAll<Record<string, unknown>>(accessToken, companyId, config.listEndpoint);
      const mapped = items.map(config.mapper).map(stripRaw);
      return c.json({
        data: mapped,
        page: 1,
        pageSize: items.length,
        totalCount: items.length,
        totalPages: 1,
        hasMore: false,
      });
    }

    // Paginated (invoices, customers, journals)
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 50;

    const result = await bokioClient.getPage<Record<string, unknown>>(
      accessToken,
      companyId,
      config.listEndpoint,
      {
        page,
        pageSize,
        query: c.req.query('query'),
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

  if (provider === 'bjornlunden') {
    const config = BL_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for bjornlunden` }, 400);
    }

    const userKey = resolved.providerCompanyId;
    if (!userKey) {
      return c.json({ error: 'No company key found for this Björn Lunden consent' }, 400);
    }

    // Singleton (CompanyInformation)
    if (config.singleton) {
      const data = await bjornLundenClient.getDetail<Record<string, unknown>>(accessToken, userKey, config.listEndpoint);
      const mapped = stripRaw(config.mapper(data) as Record<string, unknown>);
      return c.json({ data: mapped });
    }

    // Non-paginated (accounts) — fetch full list
    if (config.paginated === false) {
      const items = await bjornLundenClient.getAll<Record<string, unknown>>(accessToken, userKey, config.listEndpoint);
      const mapped = items.map(config.mapper).map(stripRaw);
      return c.json({
        data: mapped,
        page: 1,
        pageSize: items.length,
        totalCount: items.length,
        totalPages: 1,
        hasMore: false,
      });
    }

    // Paginated
    const page = c.req.query('page') ? Number(c.req.query('page')) : 1;
    const pageSize = c.req.query('pageSize') ? Number(c.req.query('pageSize')) : 50;

    const result = await bjornLundenClient.getPage<Record<string, unknown>>(
      accessToken,
      userKey,
      config.listEndpoint,
      { page, pageSize },
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

    const queryParams: Record<string, string> = {};
    const financialyear = c.req.query('financialyear');
    if (financialyear) queryParams['financialyear'] = financialyear;

    const detailPath = config.resolveDetailPath
      ? config.resolveDetailPath(resourceId, queryParams)
      : config.detailEndpoint.replace('{id}', resourceId);

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

  if (provider === 'briox') {
    const config = BRIOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for briox` }, 400);
    }

    const detailPath = config.detailEndpoint.replace('{id}', resourceId);
    const response = await brioxClient.get<{ data: Record<string, unknown> }>(accessToken, detailPath);
    const mapped = stripRaw(config.mapper(response.data));
    return c.json({ data: mapped });
  }

  if (provider === 'bokio') {
    const config = BOKIO_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not available for bokio` }, 404);
    }

    const companyId = resolved.providerCompanyId;
    if (!companyId) {
      return c.json({ error: 'No company ID found for this Bokio consent' }, 400);
    }

    const detailPath = config.detailEndpoint.replace('{id}', resourceId);
    const data = await bokioClient.getDetail<Record<string, unknown>>(accessToken, companyId, detailPath);
    const mapped = stripRaw(config.mapper(data) as Record<string, unknown>);
    return c.json({ data: mapped });
  }

  if (provider === 'bjornlunden') {
    const config = BL_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      return c.json({ error: `Resource ${resourceType} not supported for bjornlunden` }, 400);
    }

    const userKey = resolved.providerCompanyId;
    if (!userKey) {
      return c.json({ error: 'No company key found for this Björn Lunden consent' }, 400);
    }

    const detailPath = config.detailEndpoint.replace('{id}', resourceId);
    const data = await bjornLundenClient.getDetail<Record<string, unknown>>(accessToken, userKey, detailPath);
    const mapped = stripRaw(config.mapper(data) as Record<string, unknown>);
    return c.json({ data: mapped });
  }

  return c.json({ error: `Unknown provider: ${provider}` }, 400);
});

export { app as resourceRoutes };
