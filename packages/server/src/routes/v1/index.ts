import { Hono } from 'hono';
import type { DatabaseAdapter, Logger } from '@arcim-sync/core';
import { consentMiddleware, type ConsentMiddlewareOptions } from '../../middleware/consent.js';
import { salesInvoicesRoutes } from './sales-invoices.js';
import { supplierInvoicesRoutes } from './supplier-invoices.js';
import { customersRoutes } from './customers.js';
import { suppliersRoutes } from './suppliers.js';
import { journalsRoutes } from './journals.js';
import { accountingRoutes } from './accounting.js';
import { reportsRoutes } from './reports.js';
import type { AppEnv } from '../../types.js';

export function v1ResourceRoutes(
  db: DatabaseAdapter,
  logger: Logger,
  options?: ConsentMiddlewareOptions,
) {
  const app = new Hono<AppEnv>();

  // Apply consent middleware to all resource routes.
  // Skip for /sie-upload and /sie paths — those are handled by consentSieRoutes
  // and don't need OAuth credential resolution.
  app.use('/:consentId/*', async (c, next) => {
    const url = new URL(c.req.url);
    const segments = url.pathname.split('/');
    // Path is /api/v1/consents/:consentId/<sub> — check the segment after consentId
    const consentIdIdx = segments.indexOf('consents') + 2;
    const sub = segments[consentIdIdx];
    if (sub === 'sie-upload' || sub === 'sie') {
      return next();
    }
    return consentMiddleware(db, logger, options)(c, next);
  });

  // Mount resource routes
  app.route('/:consentId/salesinvoices', salesInvoicesRoutes(logger));
  app.route('/:consentId/supplierinvoices', supplierInvoicesRoutes(logger));
  app.route('/:consentId/customers', customersRoutes(logger));
  app.route('/:consentId/suppliers', suppliersRoutes(logger));
  app.route('/:consentId/journals', journalsRoutes(logger));
  app.route('/:consentId', accountingRoutes(logger));
  app.route('/:consentId', reportsRoutes(logger));

  return app;
}
