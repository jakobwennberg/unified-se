import { Hono } from 'hono';
import { noopLogger, createAESEncryption } from '@arcim-sync/core';
import type { ServerOptions } from './types.js';
import { errorHandler } from './middleware/error.js';
import { bearerAuth } from './middleware/auth.js';
import { connectionsRoutes } from './routes/connections.js';
import { syncRoutes } from './routes/sync.js';
import { entitiesRoutes } from './routes/entities.js';
import { sieRoutes } from './routes/sie.js';
import { authRoutes } from './routes/auth.js';
import { providersRoutes } from './routes/providers.js';
import { consentRoutes, consentSieRoutes } from './routes/consents.js';
import { v1ResourceRoutes } from './routes/v1/index.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { generateRoutes } from './routes/generate.js';
import { getAIConfig } from './ai/config.js';

/**
 * Create a fully configured Hono app wrapping all @arcim-sync/core capabilities.
 * This is a library — consumers mount the returned app in their own runtime.
 */
export function createServer(options: ServerOptions) {
  const { db, apiKey, fortnoxOAuth, vismaOAuth } = options;
  const logger = options.logger ?? noopLogger;

  const app = new Hono();

  // 1. Global error handler
  app.onError(errorHandler);

  // 2. Health endpoint (no auth)
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 3. Bearer auth middleware (skips /health)
  if (apiKey) {
    app.use('*', bearerAuth(apiKey));
  }

  // 4. Token encryption (shared by auth callbacks + consent middleware)
  const tokenEncryption = options.tokenEncryptionKey
    ? createAESEncryption(options.tokenEncryptionKey)
    : undefined;

  // 5. Mount route groups
  app.route('/connections', connectionsRoutes(db, logger));
  app.route('/sync', syncRoutes(db, logger));
  app.route('/entities', entitiesRoutes(db, logger));
  app.route('/sie', sieRoutes(db, logger));
  app.route('/auth', authRoutes(logger, fortnoxOAuth, vismaOAuth, db, tokenEncryption));
  app.route('/api/v1/auth', authRoutes(logger, fortnoxOAuth, vismaOAuth, db, tokenEncryption));
  app.route('/providers', providersRoutes(logger));

  // 6. Generate routes (AI company generation)
  const aiConfig = options.aiConfig ?? getAIConfig();
  app.route('/generate', generateRoutes(db, logger, aiConfig));

  const v1Options = {
    tokenEncryption,
    mode: options.mode,
    fortnoxOAuth,
    vismaOAuth,
  };

  if (options.rateLimits) {
    app.use('/api/v1/*', rateLimitMiddleware(options.rateLimits));
  }

  app.route('/api/v1/consents', consentRoutes(db, logger, { tokenEncryption }));
  app.route('/api/v1/consents', consentSieRoutes(db, logger));
  app.route('/api/v1/consents', v1ResourceRoutes(db, logger, v1Options));

  return app;
}
