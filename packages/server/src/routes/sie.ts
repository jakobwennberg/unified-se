import { Hono } from 'hono';
import type { DatabaseAdapter, Logger } from '@arcim-sync/core';

export function sieRoutes(db: DatabaseAdapter, logger: Logger) {
  const app = new Hono();

  // GET /sie/:connId/uploads
  app.get('/:connId/uploads', async (c) => {
    const connId = c.req.param('connId');
    const uploads = await db.getSIEUploads(connId);
    return c.json(uploads);
  });

  // GET /sie/:connId/:uploadId
  app.get('/:connId/:uploadId', async (c) => {
    const uploadId = c.req.param('uploadId');
    const data = await db.getSIEData(uploadId);
    if (!data) {
      return c.json({ error: 'SIE upload not found' }, 404);
    }
    return c.json(data);
  });

  return app;
}
