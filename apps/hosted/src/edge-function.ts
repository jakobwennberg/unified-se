import { Hono } from 'hono';
import { PostgresAdapter } from './db/postgres-adapter.js';
import { apiKeyAuth } from './auth/api-key-auth.js';
import { createTenantLookup } from './auth/tenant.js';

/**
 * Hosted Arcim Sync API — Supabase Edge Function entry point.
 *
 * Environment variables:
 * - DATABASE_URL: Postgres connection string
 * - TOKEN_ENCRYPTION_KEY: 64-char hex key for AES-256-GCM
 * - FORTNOX_CLIENT_ID, FORTNOX_CLIENT_SECRET, FORTNOX_REDIRECT_URI
 * - VISMA_CLIENT_ID, VISMA_CLIENT_SECRET, VISMA_REDIRECT_URI
 */
const app = new Hono();

// Lazy-initialized database adapter
let db: PostgresAdapter | null = null;

function getDb(): PostgresAdapter {
  if (!db) {
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    db = new PostgresAdapter(databaseUrl);
  }
  return db;
}

// Health check (no auth)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    mode: 'hosted',
    timestamp: new Date().toISOString(),
  });
});

// API key auth for all other routes
app.use('*', async (c, next) => {
  if (c.req.path === '/health') return next();

  const adapter = getDb();
  const lookup = createTenantLookup(adapter.db);
  const middleware = apiKeyAuth(lookup);
  return middleware(c, next);
});

// Mount the server app
app.all('/api/*', async (c) => {
  const adapter = getDb();
  const encryptionKey = process.env['TOKEN_ENCRYPTION_KEY'];

  const { createServer } = await import('@arcim-sync/server');
  const { consoleLogger } = await import('@arcim-sync/core');

  const server = createServer({
    db: adapter,
    logger: consoleLogger,
    mode: 'hosted',
    tokenEncryptionKey: encryptionKey,
    rateLimits: { maxRequests: 60, windowMs: 60_000 },
    fortnoxOAuth: process.env['FORTNOX_CLIENT_ID']
      ? {
          clientId: process.env['FORTNOX_CLIENT_ID']!,
          clientSecret: process.env['FORTNOX_CLIENT_SECRET']!,
          redirectUri: process.env['FORTNOX_REDIRECT_URI']!,
        }
      : undefined,
    vismaOAuth: process.env['VISMA_CLIENT_ID']
      ? {
          clientId: process.env['VISMA_CLIENT_ID']!,
          clientSecret: process.env['VISMA_CLIENT_SECRET']!,
          redirectUri: process.env['VISMA_REDIRECT_URI']!,
        }
      : undefined,
  });

  return server.fetch(c.req.raw);
});

export default app;
