import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { GatewayHandler, ResourceType } from '@arcim-sync/core';
import { ResourceQueryParams, CreateResourceBody } from '../../schemas-v1.js';
import type { AppEnv } from '../../types.js';

const gateway = new GatewayHandler();

export function journalsRoutes(logger: Logger) {
  const app = new Hono<AppEnv>();

  // GET /consents/:consentId/journals
  app.get('/', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
      fromDate: c.req.query('fromDate') || undefined,
      toDate: c.req.query('toDate') || undefined,
      lastModified: c.req.query('lastModified') || undefined,
      fiscalYear: c.req.query('fiscalYear') || undefined,
    });
    const opts = query.success ? query.data : {};

    const result = await gateway.listResource(
      consent.provider as any,
      credentials,
      ResourceType.Journals,
      opts,
    );
    return c.json(result);
  });

  // GET /consents/:consentId/journals/:id
  app.get('/:id', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const id = c.req.param('id');

    const result = await gateway.getResource(
      consent.provider as any,
      credentials,
      ResourceType.Journals,
      id,
    );
    if (!result) {
      return c.json({ error: 'Journal not found' }, 404);
    }
    return c.json(result);
  });

  // POST /consents/:consentId/journals
  app.post('/', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const body = await c.req.json();
    const parsed = CreateResourceBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const result = await gateway.createResource(
      consent.provider as any,
      credentials,
      ResourceType.Journals,
      parsed.data,
    );
    return c.json(result, 201);
  });

  return app;
}
