import { Hono } from 'hono';
import type { DatabaseAdapter, Logger, TokenEncryption } from '@arcim-sync/core';
import { consentMiddleware } from '../../middleware/consent.js';
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
  options?: { tokenEncryption?: TokenEncryption; mode?: 'self-hosted' | 'hosted' },
) {
  const app = new Hono<AppEnv>();

  // Apply consent middleware to all resource routes
  app.use('/:consentId/*', consentMiddleware(db, logger, options));

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
