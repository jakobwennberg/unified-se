import type { MiddlewareHandler } from 'hono';

/**
 * Bearer token auth middleware.
 * Skips /health. Returns 401 on missing/invalid token.
 */
export function bearerAuth(apiKey: string): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.path === '/health') {
      return next();
    }

    const header = c.req.header('Authorization');
    if (!header) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const token = header.replace(/^Bearer\s+/i, '');
    if (token !== apiKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    return next();
  };
}
