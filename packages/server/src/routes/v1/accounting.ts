import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { GatewayHandler, ResourceType } from '@arcim-sync/core';
import { ResourceQueryParams } from '../../schemas-v1.js';
import type { AppEnv } from '../../types.js';

const gateway = new GatewayHandler();

export function accountingRoutes(logger: Logger) {
  const app = new Hono<AppEnv>();

  app.get('/accountingaccounts', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const query = ResourceQueryParams.safeParse({ page: c.req.query('page') || undefined, pageSize: c.req.query('pageSize') || undefined });
    const opts = query.success ? query.data : {};
    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.AccountingAccounts, opts);
    return c.json(result);
  });

  app.get('/companyinformation', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.CompanyInformation);
    return c.json(result);
  });

  app.get('/accountingperiods', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.AccountingPeriods);
    return c.json(result);
  });

  app.get('/financialdimensions', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const result = await gateway.listResource(consent.provider as any, credentials, ResourceType.FinancialDimensions);
    return c.json(result);
  });

  return app;
}
