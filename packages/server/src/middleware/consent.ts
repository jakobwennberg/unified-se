import type { MiddlewareHandler } from 'hono';
import type { DatabaseAdapter, Logger, ConsentRecord, TokenEncryption, ProviderCredentials } from '@arcim-sync/core';
import { ConsentStatus } from '@arcim-sync/core';
import type { AppEnv } from '../types.js';

export interface ConsentContext {
  consent: ConsentRecord;
  credentials: ProviderCredentials;
}

/**
 * Middleware that resolves a consent from the :consentId path param.
 * Validates the consent is in ACCEPTED state and loads credentials.
 *
 * For managed tokens: decrypts from DB, checks expiry.
 * For pass-per-call: reads Authorization header.
 */
export function consentMiddleware(
  db: DatabaseAdapter,
  logger: Logger,
  options?: { tokenEncryption?: TokenEncryption; mode?: 'self-hosted' | 'hosted' },
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const consentId = c.req.param('consentId');
    if (!consentId) {
      return c.json({ error: 'Missing consentId parameter' }, 400);
    }

    const consent = await db.getConsent(consentId);
    if (!consent) {
      return c.json({ error: 'Consent not found' }, 404);
    }

    if (consent.status !== ConsentStatus.Accepted) {
      return c.json({
        error: 'Consent is not active',
        status: ConsentStatus[consent.status],
      }, 403);
    }

    // Try managed tokens first
    let credentials: ProviderCredentials | null = null;

    const tokens = await db.getConsentTokens(consentId);
    if (tokens) {
      let accessToken = tokens.accessToken;
      if (options?.tokenEncryption) {
        try {
          accessToken = options.tokenEncryption.decrypt(accessToken);
        } catch (e) {
          logger.error('Failed to decrypt token', { consentId, error: String(e) });
          return c.json({ error: 'Token decryption failed' }, 500);
        }
      }
      credentials = { accessToken };
    }

    // Fall back to pass-per-call (self-hosted mode)
    if (!credentials && options?.mode !== 'hosted') {
      const authHeader = c.req.header('Authorization');
      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        credentials = { accessToken: token };
      }
    }

    if (!credentials) {
      return c.json({ error: 'No credentials available for this consent' }, 401);
    }

    // Attach to context
    c.set('consent', consent);
    c.set('credentials', credentials);

    await next();
  };
}
