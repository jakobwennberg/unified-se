import { Hono } from 'hono';
import type { DatabaseAdapter, Logger, TokenEncryption } from '@arcim-sync/core';
import { ConsentStatus } from '@arcim-sync/core';
import { CreateConsentBody, UpdateConsentBody, ConsentQueryParams, CreateOTCBody, TokenExchangeBody } from '../schemas-v1.js';
import type { AppEnv } from '../types.js';

export function consentRoutes(
  db: DatabaseAdapter,
  logger: Logger,
  options?: { tokenEncryption?: TokenEncryption },
) {
  const app = new Hono<AppEnv>();

  // POST /api/v1/consents — create a new consent
  app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = CreateConsentBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    // Extract tenant from context (set by auth middleware)
    const tenantId = c.get('tenantId') as string ?? 'default';
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const etag = crypto.randomUUID();

    const consent = {
      id,
      tenantId,
      name: parsed.data.name,
      status: ConsentStatus.Created,
      provider: parsed.data.provider,
      orgNumber: parsed.data.orgNumber,
      companyName: parsed.data.companyName,
      systemSettingsId: parsed.data.systemSettingsId,
      etag,
      createdAt: now,
      updatedAt: now,
    };

    await db.upsertConsent(consent);
    logger.info('Consent created', { consentId: id, provider: parsed.data.provider });

    return c.json(consent, 201);
  });

  // GET /api/v1/consents — list consents
  app.get('/', async (c) => {
    const tenantId = c.get('tenantId') as string ?? 'default';
    const query = ConsentQueryParams.safeParse({
      provider: c.req.query('provider') || undefined,
      status: c.req.query('status') || undefined,
    });

    const options = query.success ? query.data : {};
    const consents = await db.getConsents(tenantId, options as Parameters<typeof db.getConsents>[1]);
    return c.json({ data: consents });
  });

  // GET /api/v1/consents/:consentId
  app.get('/:consentId', async (c) => {
    const consentId = c.req.param('consentId');
    const consent = await db.getConsent(consentId);
    if (!consent) {
      return c.json({ error: 'Consent not found' }, 404);
    }

    c.header('ETag', consent.etag);
    return c.json(consent);
  });

  // PATCH /api/v1/consents/:consentId
  app.patch('/:consentId', async (c) => {
    const consentId = c.req.param('consentId');
    const consent = await db.getConsent(consentId);
    if (!consent) {
      return c.json({ error: 'Consent not found' }, 404);
    }

    // ETag check
    const ifMatch = c.req.header('If-Match');
    if (ifMatch && ifMatch !== consent.etag) {
      return c.json({ error: 'ETag mismatch — consent was modified' }, 412);
    }

    const body = await c.req.json();
    const parsed = UpdateConsentBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    const now = new Date().toISOString();
    const updated = {
      ...consent,
      ...parsed.data,
      status: parsed.data.status ?? consent.status,
      etag: crypto.randomUUID(),
      updatedAt: now,
    };

    await db.upsertConsent(updated);
    logger.info('Consent updated', { consentId, status: updated.status });

    c.header('ETag', updated.etag);
    return c.json(updated);
  });

  // DELETE /api/v1/consents/:consentId
  app.delete('/:consentId', async (c) => {
    const consentId = c.req.param('consentId');
    const consent = await db.getConsent(consentId);
    if (!consent) {
      return c.json({ error: 'Consent not found' }, 404);
    }

    await db.deleteConsent(consentId);
    logger.info('Consent deleted', { consentId });
    return c.json({ success: true });
  });

  // POST /api/v1/consents/:consentId/otc — generate one-time code
  app.post('/:consentId/otc', async (c) => {
    const consentId = c.req.param('consentId');
    const consent = await db.getConsent(consentId);
    if (!consent) {
      return c.json({ error: 'Consent not found' }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateOTCBody.safeParse(body);
    const expiresInMinutes = parsed.success ? parsed.data.expiresInMinutes : 60;

    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString();

    await db.createOneTimeCode({
      code,
      consentId,
      expiresAt,
    });

    logger.info('OTC created', { consentId, expiresAt });
    return c.json({ code, consentId, expiresAt }, 201);
  });

  // POST /api/v1/consents/auth/token — exchange OTC + OAuth tokens
  app.post('/auth/token', async (c) => {
    const body = await c.req.json();
    const parsed = TokenExchangeBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
    }

    // Validate the OTC
    const otc = await db.validateOneTimeCode(parsed.data.code);
    if (!otc) {
      return c.json({ error: 'Invalid or expired one-time code' }, 401);
    }

    if (otc.consentId !== parsed.data.consentId) {
      return c.json({ error: 'One-time code does not match consent' }, 400);
    }

    // Store tokens (optionally encrypted)
    let accessToken = parsed.data.accessToken;
    let refreshToken = parsed.data.refreshToken;
    const encryptedAt = options?.tokenEncryption ? new Date().toISOString() : undefined;

    if (options?.tokenEncryption) {
      accessToken = options.tokenEncryption.encrypt(accessToken);
      if (refreshToken) {
        refreshToken = options.tokenEncryption.encrypt(refreshToken);
      }
    }

    await db.storeConsentTokens({
      consentId: parsed.data.consentId,
      provider: parsed.data.provider,
      accessToken,
      refreshToken,
      tokenExpiresAt: parsed.data.expiresIn
        ? new Date(Date.now() + parsed.data.expiresIn * 1000).toISOString()
        : undefined,
      scopes: parsed.data.scopes,
      encryptedAt,
    });

    // Update consent status to Accepted
    const consent = await db.getConsent(parsed.data.consentId);
    if (consent) {
      await db.upsertConsent({
        ...consent,
        status: ConsentStatus.Accepted,
        updatedAt: new Date().toISOString(),
        etag: crypto.randomUUID(),
      });
    }

    logger.info('Token stored, consent accepted', { consentId: parsed.data.consentId });
    return c.json({ success: true, consentId: parsed.data.consentId });
  });

  return app;
}
