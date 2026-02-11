import type { MiddlewareHandler } from 'hono';

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Per-tenant sliding window rate limiter.
 * Uses in-memory storage (suitable for single-instance deployments).
 */
export function rateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler {
  const windows = new Map<string, WindowEntry>();

  // Periodic cleanup of expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (entry.resetAt < now) {
        windows.delete(key);
      }
    }
  }, 60_000).unref();

  return async (c, next) => {
    // Use tenant ID from consent or API key as the rate limit key
    const consent = c.get('consent') as { tenantId?: string } | undefined;
    const key = consent?.tenantId ?? c.req.header('Authorization') ?? 'anonymous';

    const now = Date.now();
    let entry = windows.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + config.windowMs };
      windows.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(config.maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > config.maxRequests) {
      return c.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
        429,
      );
    }

    await next();
  };
}
