import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { GatewayHandler, ResourceType } from '@arcim-sync/core';
import { ResourceQueryParams } from '../../schemas-v1.js';
import type { AppEnv } from '../../types.js';

const gateway = new GatewayHandler();

export function reportsRoutes(logger: Logger) {
  const app = new Hono<AppEnv>();

  app.get('/balancesheet', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
      fiscalYear: c.req.query('fiscalYear') || undefined,
    });
    const opts = query.success ? query.data : {};

    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.BalanceSheet, opts);
    return c.json(result);
  });

  app.get('/incomestatement', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
      fiscalYear: c.req.query('fiscalYear') || undefined,
    });
    const opts = query.success ? query.data : {};

    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.IncomeStatement, opts);
    return c.json(result);
  });

  app.get('/trialbalances', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({
      page: c.req.query('page') || undefined,
      pageSize: c.req.query('pageSize') || undefined,
      fiscalYear: c.req.query('fiscalYear') || undefined,
    });
    const opts = query.success ? query.data : {};

    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.TrialBalances, opts);
    return c.json(result);
  });

  return app;
}
