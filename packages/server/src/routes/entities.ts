import { Hono } from 'hono';
import type { DatabaseAdapter, Logger } from '@arcim-sync/core';
import { EntityTypeSchema } from '@arcim-sync/core';
import { EntityQueryParams, EntityCountQuery } from '../schemas.js';

export function entitiesRoutes(db: DatabaseAdapter, logger: Logger) {
  const app = new Hono();

  // GET /entities/:connId/count
  // Registered before /:entityType to prevent "count" matching as entity type
  app.get('/:connId/count', async (c) => {
    const connId = c.req.param('connId');
    const query = EntityCountQuery.safeParse({
      entityType: c.req.query('entityType') || undefined,
    });
    const entityType = query.success ? query.data.entityType : undefined;
    const count = await db.getEntityCount(connId, entityType);
    return c.json({ count });
  });

  // GET /entities/:connId/:entityType
  app.get('/:connId/:entityType', async (c) => {
    const connId = c.req.param('connId');
    const entityTypeRaw = c.req.param('entityType');

    const entityTypeParsed = EntityTypeSchema.safeParse(entityTypeRaw);
    if (!entityTypeParsed.success) {
      return c.json(
        { error: 'Invalid entity type', details: entityTypeParsed.error.flatten() },
        400,
      );
    }
    const entityType = entityTypeParsed.data;

    const query = EntityQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
      fiscalYear: c.req.query('fiscalYear') || undefined,
      fromDate: c.req.query('fromDate') || undefined,
      toDate: c.req.query('toDate') || undefined,
      orderBy: c.req.query('orderBy') || undefined,
      orderDirection: c.req.query('orderDirection') || undefined,
    });

    if (!query.success) {
      return c.json({ error: 'Invalid query parameters', details: query.error.flatten() }, 400);
    }

    const { page, pageSize, ...rest } = query.data;

    const [data, total] = await Promise.all([
      db.getEntities(connId, entityType, { page, pageSize, ...rest }),
      db.getEntityCount(connId, entityType),
    ]);

    return c.json({ data, page, pageSize, total });
  });

  return app;
}
