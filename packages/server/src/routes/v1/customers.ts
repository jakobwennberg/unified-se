import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { GatewayHandler, ResourceType } from '@arcim-sync/core';
import { ResourceQueryParams } from '../../schemas-v1.js';
import type { AppEnv } from '../../types.js';

const gateway = new GatewayHandler();

export function customersRoutes(logger: Logger) {
  const app = new Hono<AppEnv>();

  app.get('/', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
    });
    const opts = query.success ? query.data : {};

    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.Customers, opts);
    return c.json(result);
  });

  app.get('/:id', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const result = await gateway.getResource(consent.provider as any, credentials, ResourceType.Customers, c.req.param('id'));
    if (!result) return c.json({ error: 'Customer not found' }, 404);
    return c.json(result);
  });

  return app;
}
