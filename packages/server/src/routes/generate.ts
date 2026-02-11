import { Hono } from 'hono';
import { z } from 'zod';
import type { DatabaseAdapter, Logger } from '@arcim-sync/core';
import type { AIConfig } from '../ai/config.js';
import { hasAWSCredentials } from '../ai/config.js';
import { CompanyGenerator } from '../services/company-generator.js';

const GenerateCompanyBody = z.object({
  industry: z
    .enum([
      'consulting',
      'retail',
      'manufacturing',
      'restaurant',
      'construction',
      'saas',
      'healthcare',
      'transport',
      'real_estate',
    ])
    .optional(),
  size: z.enum(['micro', 'small', 'medium']).optional(),
  fiscalYear: z.number().int().min(2000).max(2099).optional(),
  includePreviousYear: z.boolean().optional(),
});

export function generateRoutes(
  db: DatabaseAdapter,
  logger: Logger,
  aiConfig: AIConfig,
) {
  const app = new Hono();

  // POST /generate/company — Generate and return result
  app.post('/company', async (c) => {
    if (!hasAWSCredentials(aiConfig)) {
      return c.json(
        { error: 'AI generation not available — AWS credentials not configured' },
        503,
      );
    }

    const raw = await c.req.json();
    const parsed = GenerateCompanyBody.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        400,
      );
    }

    logger.info('Generating company', { request: parsed.data });

    const generator = new CompanyGenerator(aiConfig);
    const result = await generator.generate(parsed.data);

    logger.info('Company generated', {
      companyName: result.profile.companyName,
      accounts: result.sieData.accounts.length,
      transactions: result.sieData.transactions.length,
    });

    return c.json(result);
  });

  // POST /generate/company/save — Generate + persist to DB
  app.post('/company/save', async (c) => {
    if (!hasAWSCredentials(aiConfig)) {
      return c.json(
        { error: 'AI generation not available — AWS credentials not configured' },
        503,
      );
    }

    const raw = await c.req.json();
    const parsed = GenerateCompanyBody.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        400,
      );
    }

    logger.info('Generating and saving company', { request: parsed.data });

    const generator = new CompanyGenerator(aiConfig);
    const result = await generator.generate(parsed.data);

    // Create a connection for this generated company
    const connectionId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    await db.upsertConnection({
      connectionId,
      provider: 'fortnox',
      displayName: result.profile.companyName,
      organizationNumber: result.profile.orgNumber,
      createdAt: now,
      updatedAt: now,
      metadata: {
        generated: true,
        industry: result.profile.industry,
        size: result.profile.size,
      },
    });

    // Store SIE data
    const fiscalYear =
      parsed.data.fiscalYear ?? new Date().getFullYear() - 1;

    const uploadId = await db.storeSIEData(connectionId, {
      connectionId,
      fiscalYear,
      sieType: 4,
      parsed: result.sieData,
      kpis: result.kpis,
      rawContent: result.sieText,
    });

    logger.info('Company saved', {
      connectionId,
      uploadId,
      companyName: result.profile.companyName,
    });

    return c.json({
      ...result,
      connectionId,
      uploadId,
      saved: true,
    });
  });

  return app;
}
