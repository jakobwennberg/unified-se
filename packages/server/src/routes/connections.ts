import { Hono } from 'hono';
import type { DatabaseAdapter, Logger } from '@arcim-sync/core';
import { CreateConnectionBody, ConnectionQueryParams } from '../schemas.js';

export function connectionsRoutes(db: DatabaseAdapter, logger: Logger) {
  const app = new Hono();

  // POST /connections
  app.post('/', async (c) => {
    const raw = await c.req.json();
    const parsed = CreateConnectionBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const { connectionId, provider, displayName, organizationNumber, metadata } = parsed.data;
    const now = new Date().toISOString();

    const record = {
      connectionId,
      provider,
      displayName,
      organizationNumber: organizationNumber ?? null,
      createdAt: now,
      updatedAt: now,
      metadata,
    };

    await db.upsertConnection(record);
    logger.info('Connection upserted', { connectionId, provider });

    return c.json(record, 201);
  });

  // GET /connections
  app.get('/', async (c) => {
    const query = ConnectionQueryParams.safeParse({
      provider: c.req.query('provider') || undefined,
    });

    const options = query.success ? { provider: query.data.provider } : {};
    const connections = await db.getConnections(options);
    return c.json(connections);
  });

  // GET /connections/:id
  app.get('/:id', async (c) => {
    const connection = await db.getConnection(c.req.param('id'));
    if (!connection) {
      return c.json({ error: 'Connection not found' }, 404);
    }
    return c.json(connection);
  });

  // DELETE /connections/:id
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await db.getConnection(id);
    if (!existing) {
      return c.json({ error: 'Connection not found' }, 404);
    }
    await db.deleteConnection(id);
    logger.info('Connection deleted', { connectionId: id });
    return c.json({ deleted: true });
  });

  return app;
}
