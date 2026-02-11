import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SQLiteAdapter } from '../db/sqlite-adapter.js';
import { SyncEngine } from './engine.js';
import { registerProvider } from '../providers/index.js';
import type { AccountingProvider } from '../providers/base.js';
import type { CanonicalEntityRecord, EntityType } from '../types/entity.js';
import { contentHash } from '../utils/hash.js';

/**
 * Build a mock FortnoxProvider that returns fixture data without real HTTP calls.
 */
function createMockProvider(): AccountingProvider {
  const invoiceFixtures: Record<string, unknown>[] = [
    {
      DocumentNumber: '1001',
      CustomerNumber: 'C100',
      CustomerName: 'Acme AB',
      InvoiceDate: '2024-03-15',
      DueDate: '2024-04-15',
      Total: 12500,
      Currency: 'SEK',
      Cancelled: false,
      Booked: true,
      Sent: true,
      Balance: 0,
    },
    {
      DocumentNumber: '1002',
      CustomerNumber: 'C200',
      CustomerName: 'Widget AB',
      InvoiceDate: '2024-03-20',
      DueDate: '2024-04-20',
      Total: 8000,
      Currency: 'SEK',
      Cancelled: false,
      Booked: false,
      Sent: true,
      Balance: 8000,
    },
  ];

  const customerFixtures: Record<string, unknown>[] = [
    { CustomerNumber: 'C100', Name: 'Acme AB', Email: 'info@acme.se' },
    { CustomerNumber: 'C200', Name: 'Widget AB', Email: 'info@widget.se' },
  ];

  function mapToCanonical(
    raw: Record<string, unknown>,
    entityType: EntityType,
  ): CanonicalEntityRecord {
    const hash = contentHash(raw);
    if (entityType === 'invoice') {
      return {
        external_id: String(raw['DocumentNumber']),
        entity_type: 'invoice',
        provider: 'fortnox',
        fiscal_year: 2024,
        document_date: raw['InvoiceDate'] as string,
        due_date: raw['DueDate'] as string,
        counterparty_number: raw['CustomerNumber'] as string,
        counterparty_name: raw['CustomerName'] as string,
        amount: raw['Total'] as number,
        currency: 'SEK',
        status: raw['Booked'] ? 'booked' : 'sent',
        raw_data: raw,
        last_modified: '2024-03-20T12:00:00Z',
        content_hash: hash,
      };
    }
    // customer
    return {
      external_id: String(raw['CustomerNumber']),
      entity_type: 'customer',
      provider: 'fortnox',
      fiscal_year: null,
      document_date: null,
      due_date: null,
      counterparty_number: raw['CustomerNumber'] as string,
      counterparty_name: raw['Name'] as string,
      amount: null,
      currency: 'SEK',
      status: null,
      raw_data: raw,
      last_modified: '2024-03-20T12:00:00Z',
      content_hash: hash,
    };
  }

  const sieContent = [
    '#FLAGGA 0',
    '#SIETYP 4',
    '#FNAMN "Test AB"',
    '#RAR 0 20240101 20241231',
    '#KONTO 1910 "Kassa"',
    '#KONTO 3010 "Försäljning"',
    '#UB 0 1910 50000.00',
    '#RES 0 3010 -100000.00',
    '#IB 0 1910 40000.00',
  ].join('\n');

  return {
    name: 'fortnox' as const,
    getCapabilities: () => ({
      name: 'fortnox' as const,
      displayName: 'Fortnox',
      supportedEntityTypes: ['invoice', 'customer'] as EntityType[],
      supportsSIE: true,
      sieTypes: [4] as (1 | 2 | 3 | 4)[],
      supportsIncrementalSync: true,
      incrementalSyncEntities: ['invoice'] as EntityType[],
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
    fetchEntities: async (_creds, options) => {
      const type = options.entityType;
      const fixtures = type === 'invoice' ? invoiceFixtures : customerFixtures;
      const entities = fixtures.map((f) => mapToCanonical(f, type));
      return {
        entities,
        nextCursor: '2024-03-20T12:00:00Z',
        totalCount: entities.length,
        hasMore: false,
      };
    },
    fetchAllEntities: async (_creds, options) => {
      const type = options.entityType;
      const fixtures = type === 'invoice' ? invoiceFixtures : customerFixtures;
      return fixtures.map((f) => mapToCanonical(f, type));
    },
    fetchSIE: async () => {
      // Import the SIE parsing tools
      const { parseSIE } = await import('../sie/parser.js');
      const { calculateKPIs } = await import('../sie/kpi.js');

      const parsed = parseSIE(sieContent);
      const kpis = calculateKPIs(parsed);

      return {
        files: [
          {
            fiscalYear: 2024,
            sieType: 4 as const,
            rawContent: sieContent,
            parsed,
            kpis,
          },
        ],
      };
    },
  };
}

describe('E2E: SyncEngine + SQLiteAdapter + FortnoxProvider', () => {
  let adapter: SQLiteAdapter;
  let engine: SyncEngine;

  beforeEach(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.migrate();

    // Register mock provider
    const mockProvider = createMockProvider();
    registerProvider('fortnox', () => mockProvider);

    engine = new SyncEngine(adapter);
  });

  it('full sync pipeline: sync → verify data → sync again → verify unchanged', async () => {
    // Step 1: Create connection
    const connectionId = 'e2e-conn-1';
    await adapter.upsertConnection({
      connectionId,
      provider: 'fortnox',
      displayName: 'E2E Test Company',
      organizationNumber: '5561234567',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Step 2: First sync
    const progress = await engine.executeSync({
      connectionId,
      provider: 'fortnox',
      credentials: { accessToken: 'test-token' },
      entityTypes: ['invoice', 'customer'],
      includeSIE: true,
    });

    // Verify sync completed
    expect(progress.status).toBe('completed');
    expect(progress.progress).toBe(100);
    expect(progress.entityResults).toHaveLength(2);

    // Verify invoice entity results
    const invoiceResult = progress.entityResults.find((r) => r.entityType === 'invoice');
    expect(invoiceResult).toBeDefined();
    expect(invoiceResult!.success).toBe(true);
    expect(invoiceResult!.recordsFetched).toBe(2);
    expect(invoiceResult!.recordsInserted).toBe(2);
    expect(invoiceResult!.recordsUpdated).toBe(0);
    expect(invoiceResult!.recordsUnchanged).toBe(0);

    // Verify customer entity results
    const customerResult = progress.entityResults.find((r) => r.entityType === 'customer');
    expect(customerResult).toBeDefined();
    expect(customerResult!.recordsInserted).toBe(2);

    // Step 3: Verify entities stored in DB
    const invoices = await adapter.getEntities(connectionId, 'invoice');
    expect(invoices).toHaveLength(2);
    expect(invoices[0]!.external_id).toBeTruthy();
    expect(invoices[0]!.provider).toBe('fortnox');

    const customers = await adapter.getEntities(connectionId, 'customer');
    expect(customers).toHaveLength(2);

    // Step 4: Verify entity count
    const totalCount = await adapter.getEntityCount(connectionId);
    expect(totalCount).toBe(4); // 2 invoices + 2 customers

    // Step 5: Verify sync state updated
    const invoiceSyncState = await adapter.getSyncState(connectionId, 'invoice');
    expect(invoiceSyncState).not.toBeNull();
    expect(invoiceSyncState!.lastSyncAt).toBeTruthy();
    expect(invoiceSyncState!.recordsFetched).toBe(2);

    // Step 6: Verify SIE data stored
    expect(progress.sieResult).toBeDefined();
    expect(progress.sieResult!.success).toBe(true);
    expect(progress.sieResult!.fiscalYearsProcessed).toBe(1);

    const sieUploads = await adapter.getSIEUploads(connectionId);
    expect(sieUploads).toHaveLength(1);
    expect(sieUploads[0]!.fiscalYear).toBe(2024);
    expect(sieUploads[0]!.sieType).toBe(4);
    expect(sieUploads[0]!.accountCount).toBe(2); // 2 accounts in fixture

    const sieData = await adapter.getSIEData(sieUploads[0]!.uploadId);
    expect(sieData).not.toBeNull();
    expect(sieData!.kpis).toBeDefined();
    expect(sieData!.parsed).toBeDefined();
    expect(sieData!.rawContent).toContain('#FLAGGA');

    // Step 7: Verify sync progress stored
    const storedProgress = await adapter.getSyncProgress(progress.jobId);
    expect(storedProgress).not.toBeNull();
    expect(storedProgress!.status).toBe('completed');

    // Step 8: Second sync — same data → all unchanged (hash-based detection)
    const progress2 = await engine.executeSync({
      connectionId,
      provider: 'fortnox',
      credentials: { accessToken: 'test-token' },
      entityTypes: ['invoice', 'customer'],
      includeSIE: false,
    });

    expect(progress2.status).toBe('completed');

    const invoiceResult2 = progress2.entityResults.find((r) => r.entityType === 'invoice');
    expect(invoiceResult2!.recordsInserted).toBe(0);
    expect(invoiceResult2!.recordsUpdated).toBe(0);
    expect(invoiceResult2!.recordsUnchanged).toBe(2);

    const customerResult2 = progress2.entityResults.find((r) => r.entityType === 'customer');
    expect(customerResult2!.recordsInserted).toBe(0);
    expect(customerResult2!.recordsUpdated).toBe(0);
    expect(customerResult2!.recordsUnchanged).toBe(2);

    // Step 9: Verify sync history
    const history = await adapter.getSyncHistory(connectionId);
    expect(history).toHaveLength(2);
    expect(history[0]!.jobId).toBe(progress2.jobId); // Most recent first
  });
});
