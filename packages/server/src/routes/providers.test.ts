import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter, registerProvider } from '@arcim-sync/core';
import type { AccountingProvider } from '@arcim-sync/core';
import { createServer } from '../app.js';

describe('providers routes', () => {
  let db: SQLiteAdapter;

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
  });

  it('GET /providers lists providers with capabilities', async () => {
    const mockProvider: AccountingProvider = {
      name: 'fortnox' as const,
      getCapabilities: () => ({
        name: 'fortnox' as const,
        displayName: 'Fortnox',
        supportedEntityTypes: ['invoice', 'customer'] as any[],
        supportsSIE: true,
        sieTypes: [4] as any[],
        supportsIncrementalSync: true,
        incrementalSyncEntities: ['invoice'] as any[],
        authType: 'oauth2' as const,
        rateLimits: { maxRequests: 25, windowMs: 1000 },
      }),
      validateCredentials: async () => true,
      getCompanyInfo: async () => ({ companyName: 'Test', organizationNumber: null, raw: {} }),
      getFinancialYears: async () => [],
      fetchEntities: async () => ({ entities: [], nextCursor: null, totalCount: 0, hasMore: false }),
      fetchAllEntities: async () => [],
      fetchSIE: async () => ({ files: [] }),
    };

    registerProvider('fortnox', () => mockProvider);

    const app = createServer({ db });
    const res = await app.request('/providers');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    const fortnox = body.find((p: any) => p.name === 'fortnox');
    expect(fortnox).toBeDefined();
    expect(fortnox.displayName).toBe('Fortnox');
    expect(fortnox.supportsSIE).toBe(true);
  });

  it('GET /providers returns array (may be empty or populated depending on registry)', async () => {
    // This test verifies the route works regardless of registry state
    const app = createServer({ db });
    const res = await app.request('/providers');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
