import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter, registerProvider } from '@arcim-sync/core';
import type { AccountingProvider, SyncProgress } from '@arcim-sync/core';
import { contentHash } from '@arcim-sync/core';
import { createServer } from '../app.js';

function createMockProvider(): AccountingProvider {
  return {
    name: 'fortnox' as const,
    getCapabilities: () => ({
      name: 'fortnox' as const,
      displayName: 'Fortnox',
      supportedEntityTypes: ['invoice'] as any[],
      supportsSIE: false,
      sieTypes: [],
      supportsIncrementalSync: true,
      incrementalSyncEntities: ['invoice'] as any[],
      authType: 'oauth2' as const,
      rateLimits: { maxRequests: 25, windowMs: 1000 },
    }),
    validateCredentials: async () => true,
    getCompanyInfo: async () => ({
      companyName: 'Test AB',
      organizationNumber: '5561234567',
      raw: {},
    }),
    getFinancialYears: async () => [
      { id: 1, fromDate: '2024-01-01', toDate: '2024-12-31', year: 2024 },
    ],
    fetchEntities: async () => ({
      entities: [],
      nextCursor: null,
      totalCount: 0,
      hasMore: false,
    }),
    fetchAllEntities: async () => {
      const raw = { DocumentNumber: '1001', Total: 1000 };
      return [
        {
          external_id: '1001',
          entity_type: 'invoice' as const,
          provider: 'fortnox' as const,
          fiscal_year: 2024,
          document_date: '2024-03-15',
          due_date: '2024-04-15',
          counterparty_number: 'C100',
          counterparty_name: 'Acme AB',
          amount: 1000,
          currency: 'SEK',
          status: 'booked',
          raw_data: raw,
          last_modified: '2024-03-20T12:00:00Z',
          content_hash: contentHash(raw),
        },
      ];
    },
    fetchSIE: async () => ({ files: [] }),
  };
}

describe('sync routes', () => {
  let db: SQLiteAdapter;
  let app: ReturnType<typeof createServer>;
  const connId = 'sync-conn-1';

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    app = createServer({ db });

    // Register mock provider
    registerProvider('fortnox', () => createMockProvider());

    // Seed connection
    await db.upsertConnection({
      connectionId: connId,
      provider: 'fortnox',
      displayName: 'Sync Test AB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('POST /sync returns 202 with jobId', async () => {
    const res = await app.request('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connId,
        provider: 'fortnox',
        credentials: { accessToken: 'test-token' },
      }),
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.jobId).toBeDefined();
    expect(typeof body.jobId).toBe('string');
  });

  it('GET /sync/:jobId returns pending progress', async () => {
    // Seed a pending progress record
    const jobId = 'test-job-pending';
    await db.upsertSyncProgress({
      jobId,
      connectionId: connId,
      provider: 'fortnox',
      status: 'pending',
      progress: 0,
      entityResults: [],
      startedAt: new Date().toISOString(),
    });

    const res = await app.request(`/sync/${jobId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobId).toBe(jobId);
    expect(body.status).toBe('pending');
  });

  it('GET /sync/:jobId returns completed progress', async () => {
    const jobId = 'test-job-completed';
    await db.upsertSyncProgress({
      jobId,
      connectionId: connId,
      provider: 'fortnox',
      status: 'completed',
      progress: 100,
      entityResults: [
        {
          entityType: 'invoice',
          recordsFetched: 10,
          recordsInserted: 8,
          recordsUpdated: 2,
          recordsUnchanged: 0,
          success: true,
          durationMs: 500,
        },
      ],
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:00:05Z',
      totalDurationMs: 5000,
    });

    const res = await app.request(`/sync/${jobId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('completed');
    expect(body.progress).toBe(100);
    expect(body.entityResults).toHaveLength(1);
  });

  it('GET /sync/:jobId returns 404 when not found', async () => {
    const res = await app.request('/sync/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Sync job not found');
  });

  it('GET /sync/history/:connectionId lists sync history', async () => {
    await db.upsertSyncProgress({
      jobId: 'job-1',
      connectionId: connId,
      provider: 'fortnox',
      status: 'completed',
      progress: 100,
      entityResults: [],
      startedAt: '2024-01-01T00:00:00Z',
    });
    await db.upsertSyncProgress({
      jobId: 'job-2',
      connectionId: connId,
      provider: 'fortnox',
      status: 'completed',
      progress: 100,
      entityResults: [],
      startedAt: '2024-01-02T00:00:00Z',
    });

    const res = await app.request(`/sync/history/${connId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('POST /sync returns 400 on invalid body', async () => {
    const res = await app.request('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: 'x' }), // missing provider, credentials
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('POST /sync returns 404 for nonexistent connection', async () => {
    const res = await app.request('/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: 'nonexistent',
        provider: 'fortnox',
        credentials: { accessToken: 'test-token' },
      }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Connection not found');
  });
});
