import { Hono } from 'hono';
import type { DatabaseAdapter, Logger, SyncProgress } from '@arcim-sync/core';
import { SyncEngine } from '@arcim-sync/core';
import { TriggerSyncBody, SyncHistoryQuery } from '../schemas.js';

export function syncRoutes(db: DatabaseAdapter, logger: Logger) {
  const app = new Hono();

  // POST /sync — async model: return 202 + jobId, fire sync in background
  app.post('/', async (c) => {
    const raw = await c.req.json();
    const parsed = TriggerSyncBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const { connectionId, provider, credentials, entityTypes, includeSIE, sieOptions } = parsed.data;

    // Verify connection exists
    const connection = await db.getConnection(connectionId);
    if (!connection) {
      return c.json({ error: 'Connection not found' }, 404);
    }

    // Generate server-controlled jobId and seed pending record
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const pendingProgress: SyncProgress = {
      jobId,
      connectionId,
      provider,
      status: 'pending',
      progress: 0,
      entityResults: [],
      startedAt: now,
    };

    await db.upsertSyncProgress(pendingProgress);

    // Fire sync in background (fire-and-forget)
    const engine = new SyncEngine(db, { logger });
    const job = { connectionId, provider, credentials, entityTypes, includeSIE, sieOptions };

    // We run executeSync in the background. It generates its own internal jobId,
    // so we copy the final result into our server-controlled jobId record.
    engine.executeSync(job).then(
      async (result) => {
        await db.upsertSyncProgress({
          ...result,
          jobId, // overwrite engine's internal jobId with ours
        });
      },
      async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Sync failed', { jobId, error: message });
        await db.upsertSyncProgress({
          ...pendingProgress,
          status: 'failed',
          error: message,
          completedAt: new Date().toISOString(),
        });
      },
    );

    return c.json({ jobId }, 202);
  });

  // GET /sync/:jobId
  app.get('/:jobId', async (c) => {
    const jobId = c.req.param('jobId');
    const progress = await db.getSyncProgress(jobId);
    if (!progress) {
      return c.json({ error: 'Sync job not found' }, 404);
    }
    return c.json(progress);
  });

  // GET /sync/history/:connectionId
  app.get('/history/:connectionId', async (c) => {
    const connectionId = c.req.param('connectionId');
    const query = SyncHistoryQuery.safeParse({
      limit: c.req.query('limit') || undefined,
    });
    const limit = query.success ? query.data.limit : 20;
    const history = await db.getSyncHistory(connectionId, limit);
    return c.json(history);
  });

  return app;
}
