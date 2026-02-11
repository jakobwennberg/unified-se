import type { MiddlewareHandler } from 'hono';
import { createHash } from 'node:crypto';

/**
 * Hash an API key for comparison.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export interface TenantRecord {
  id: string;
  name: string;
  email: string;
  plan: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  maxConsents: number;
}

export type TenantLookupFn = (apiKeyHash: string) => Promise<TenantRecord | null>;

/**
 * API key authentication middleware for the hosted platform.
 */
export function apiKeyAuth(lookupTenant: TenantLookupFn): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.path === '/health') {
      return next();
    }

    const header = c.req.header('Authorization');
    if (!header) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const apiKey = header.replace(/^Bearer\s+/i, '');
    if (!apiKey) {
      return c.json({ error: 'Invalid API key format' }, 401);
    }

    const keyHash = hashApiKey(apiKey);
    const tenant = await lookupTenant(keyHash);

    if (!tenant) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    c.set('tenantId', tenant.id);
    c.set('tenant', tenant);

    await next();
  };
}
