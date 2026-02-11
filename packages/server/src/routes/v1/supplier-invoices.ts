import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { GatewayHandler, ResourceType } from '@arcim-sync/core';
import { ResourceQueryParams, CreateResourceBody } from '../../schemas-v1.js';
import type { AppEnv } from '../../types.js';

const gateway = new GatewayHandler();

export function supplierInvoicesRoutes(logger: Logger) {
  const app = new Hono<AppEnv>();

  // GET /consents/:consentId/supplierinvoices
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
      ResourceType.SupplierInvoices,
      opts,
    );
    return c.json(result);
  });

  // GET /consents/:consentId/supplierinvoices/:id
  app.get('/:id', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const id = c.req.param('id');

    const result = await gateway.getResource(
      consent.provider as any,
      credentials,
      ResourceType.SupplierInvoices,
      id,
    );
    if (!result) {
      return c.json({ error: 'Supplier invoice not found' }, 404);
    }
    return c.json(result);
  });

  // POST /consents/:consentId/supplierinvoices
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
      ResourceType.SupplierInvoices,
      parsed.data,
    );
    return c.json(result, 201);
  });

  // GET /consents/:consentId/supplierinvoices/:id/payments
  app.get('/:id/payments', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const id = c.req.param('id');

    const result = await gateway.listSubResource(
      consent.provider as any,
      credentials,
      ResourceType.SupplierInvoices,
      id,
      ResourceType.Payments,
    );
    return c.json(result);
  });

  // POST /consents/:consentId/supplierinvoices/:id/payments
  app.post('/:id/payments', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const id = c.req.param('id');
    const body = await c.req.json();

    const result = await gateway.createSubResource(
      consent.provider as any,
      credentials,
      ResourceType.SupplierInvoices,
      id,
      ResourceType.Payments,
      body,
    );
    return c.json(result, 201);
  });

  // GET /consents/:consentId/supplierinvoices/:id/attachments
  app.get('/:id/attachments', async (c) => {
    const consent = c.get('consent') as { provider: string };
    const credentials = c.get('credentials') as { accessToken: string };
    const id = c.req.param('id');

    const result = await gateway.listSubResource(
      consent.provider as any,
      credentials,
      ResourceType.SupplierInvoices,
      id,
      ResourceType.Attachments,
    );
    return c.json(result);
  });

  return app;
}
