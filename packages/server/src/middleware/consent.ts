import type { MiddlewareHandler } from 'hono';
import type { DatabaseAdapter, Logger, ConsentRecord, TokenEncryption, ProviderCredentials } from '@arcim-sync/core';
import { ConsentStatus, refreshFortnoxToken, refreshVismaToken } from '@arcim-sync/core';
import type { AppEnv } from '../types.js';
import type { FortnoxOAuthConfig, VismaOAuthConfig } from '../types.js';

export interface ConsentContext {
  consent: ConsentRecord;
  credentials: ProviderCredentials;
}

export interface ConsentMiddlewareOptions {
  tokenEncryption?: TokenEncryption;
  mode?: 'self-hosted' | 'hosted';
  fortnoxOAuth?: FortnoxOAuthConfig;
  vismaOAuth?: VismaOAuthConfig;
}

/**
 * Middleware that resolves a consent from the :consentId path param.
 * Validates the consent is in ACCEPTED state and loads credentials.
 *
 * For managed tokens: decrypts from DB, checks expiry, refreshes if needed.
 * For pass-per-call: reads Authorization header.
 */
export function consentMiddleware(
  db: DatabaseAdapter,
  logger: Logger,
  options?: ConsentMiddlewareOptions,
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
      let refreshToken = tokens.refreshToken;

      // Decrypt tokens
      if (options?.tokenEncryption) {
        try {
          accessToken = options.tokenEncryption.decrypt(accessToken);
          if (refreshToken) {
            refreshToken = options.tokenEncryption.decrypt(refreshToken);
          }
        } catch (e) {
          logger.error('Failed to decrypt token', { consentId, error: String(e) });
          return c.json({ error: 'Token decryption failed' }, 500);
        }
      }

      // Check if token is expired and refresh if possible
      const isExpired = tokens.tokenExpiresAt && new Date(tokens.tokenExpiresAt) < new Date();
      if (isExpired && refreshToken) {
        logger.info('Access token expired, attempting refresh', { consentId, provider: consent.provider });
        try {
          const refreshed = await refreshProviderToken(consent.provider, refreshToken, options);
          accessToken = refreshed.access_token;

          // Store updated tokens
          let encAccessToken = refreshed.access_token;
          let encRefreshToken = refreshed.refresh_token;
          if (options?.tokenEncryption) {
            encAccessToken = options.tokenEncryption.encrypt(encAccessToken);
            if (encRefreshToken) {
              encRefreshToken = options.tokenEncryption.encrypt(encRefreshToken);
            }
          }
          await db.storeConsentTokens({
            consentId,
            provider: consent.provider,
            accessToken: encAccessToken,
            refreshToken: encRefreshToken,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          });
          logger.info('Token refreshed successfully', { consentId });
        } catch (e) {
          logger.error('Token refresh failed', { consentId, error: String(e) });
          return c.json({ error: 'Token expired and refresh failed. Please re-authorize.' }, 401);
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

async function refreshProviderToken(
  provider: string,
  refreshToken: string,
  options?: ConsentMiddlewareOptions,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  if (provider === 'fortnox' && options?.fortnoxOAuth) {
    return refreshFortnoxToken(options.fortnoxOAuth, refreshToken);
  }
  if (provider === 'visma' && options?.vismaOAuth) {
    return refreshVismaToken(options.vismaOAuth, refreshToken);
  }
  throw new Error(`No OAuth config for provider "${provider}" — cannot refresh token`);
}
