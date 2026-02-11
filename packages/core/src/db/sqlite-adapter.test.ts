import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter } from './sqlite-adapter.js';
import type { CanonicalEntityRecord } from '../types/entity.js';
import type { SyncProgress } from '../types/sync.js';
import type { SIEFullData, SIEKPIs, SIEParseResult } from '../types/sie.js';
import type { ConnectionRecord } from '../types/database.js';
import { contentHash } from '../utils/hash.js';

function makeEntity(overrides?: Partial<CanonicalEntityRecord>): CanonicalEntityRecord {
  const raw = { DocumentNumber: '1001', Total: 5000, ...overrides?.raw_data };
  return {
    external_id: '1001',
    entity_type: 'invoice',
    provider: 'fortnox',
    fiscal_year: 2024,
    document_date: '2024-03-15',
    due_date: '2024-04-15',
    counterparty_number: 'C100',
    counterparty_name: 'Test AB',
    amount: 5000,
    currency: 'SEK',
    status: 'booked',
    raw_data: raw,
    last_modified: '2024-03-15T10:00:00Z',
    content_hash: contentHash(raw),
    ...overrides,
  };
}

function makeConnection(overrides?: Partial<ConnectionRecord>): ConnectionRecord {
  const now = new Date().toISOString();
  return {
    connectionId: 'conn-1',
    provider: 'fortnox',
    displayName: 'Test Company',
    organizationNumber: '5561234567',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSIEData(overrides?: Partial<SIEFullData>): SIEFullData {
  return {
    connectionId: 'conn-1',
    fiscalYear: 2024,
    sieType: 4,
    parsed: {
      metadata: { companyName: 'Test AB', currency: 'SEK', generatedDate: null, sieType: '4', fiscalYearStart: '2024-01-01', fiscalYearEnd: '2024-12-31' },
      accounts: [{ accountNumber: '1910', accountName: 'Kassa', accountGroup: '1 - Tillgångar' }],
      dimensions: [],
      transactions: [],
      balances: [],
    } as unknown as SIEParseResult,
    kpis: { totalAssets: 100000, netSales: 50000 } as unknown as SIEKPIs,
    rawContent: '#FLAGGA 0\n#SIETYP 4\n',
    ...overrides,
  };
}

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(async () => {
    adapter = new SQLiteAdapter(':memory:');
    await adapter.migrate();
  });

  // ============================================
  // Connections
  // ============================================

  describe('connections', () => {
    it('upserts and retrieves a connection', async () => {
      const conn = makeConnection();
      await adapter.upsertConnection(conn);

      const result = await adapter.getConnection('conn-1');
      expect(result).not.toBeNull();
      expect(result!.connectionId).toBe('conn-1');
      expect(result!.provider).toBe('fortnox');
      expect(result!.displayName).toBe('Test Company');
    });

    it('updates an existing connection', async () => {
      await adapter.upsertConnection(makeConnection());
      await adapter.upsertConnection(
        makeConnection({ displayName: 'Updated Company', updatedAt: new Date().toISOString() }),
      );

      const result = await adapter.getConnection('conn-1');
      expect(result!.displayName).toBe('Updated Company');
    });

    it('lists connections', async () => {
      await adapter.upsertConnection(makeConnection({ connectionId: 'conn-1' }));
      await adapter.upsertConnection(makeConnection({ connectionId: 'conn-2', provider: 'visma', displayName: 'Visma Co' }));

      const all = await adapter.getConnections();
      expect(all).toHaveLength(2);
    });

    it('filters connections by provider', async () => {
      await adapter.upsertConnection(makeConnection({ connectionId: 'conn-1' }));
      await adapter.upsertConnection(makeConnection({ connectionId: 'conn-2', provider: 'visma' }));

      const fortnoxOnly = await adapter.getConnections({ provider: 'fortnox' });
      expect(fortnoxOnly).toHaveLength(1);
      expect(fortnoxOnly[0]!.connectionId).toBe('conn-1');
    });

    it('returns null for non-existent connection', async () => {
      const result = await adapter.getConnection('nonexistent');
      expect(result).toBeNull();
    });

    it('cascades delete to all child records', async () => {
      const conn = makeConnection();
      await adapter.upsertConnection(conn);

      // Add entities
      await adapter.upsertEntities('conn-1', 'invoice', [makeEntity()]);

      // Add sync state
      await adapter.updateSyncState('conn-1', 'invoice', {
        lastSyncAt: new Date().toISOString(),
        recordsFetched: 10,
      });

      // Add sync progress
      await adapter.upsertSyncProgress({
        jobId: 'job-1',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'completed',
        progress: 100,
        entityResults: [],
        startedAt: new Date().toISOString(),
      });

      // Add SIE data
      await adapter.storeSIEData('conn-1', makeSIEData());

      // Delete connection — should cascade
      await adapter.deleteConnection('conn-1');

      const connection = await adapter.getConnection('conn-1');
      expect(connection).toBeNull();

      const entities = await adapter.getEntities('conn-1', 'invoice');
      expect(entities).toHaveLength(0);

      const syncState = await adapter.getSyncState('conn-1', 'invoice');
      expect(syncState).toBeNull();

      const progress = await adapter.getSyncProgress('job-1');
      expect(progress).toBeNull();

      const sieUploads = await adapter.getSIEUploads('conn-1');
      expect(sieUploads).toHaveLength(0);
    });
  });

  // ============================================
  // Entity Records
  // ============================================

  describe('entities', () => {
    it('inserts new entities', async () => {
      const result = await adapter.upsertEntities('conn-1', 'invoice', [
        makeEntity({ external_id: '1001' }),
        makeEntity({ external_id: '1002' }),
      ]);

      expect(result.inserted).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
    });

    it('detects unchanged entities by hash', async () => {
      const entity = makeEntity();
      await adapter.upsertEntities('conn-1', 'invoice', [entity]);

      // Same entity again — should be unchanged
      const result = await adapter.upsertEntities('conn-1', 'invoice', [entity]);
      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(1);
    });

    it('detects updated entities when hash changes', async () => {
      await adapter.upsertEntities('conn-1', 'invoice', [makeEntity()]);

      // Same external_id but different data
      const updatedRaw = { DocumentNumber: '1001', Total: 7500 };
      const updated = makeEntity({
        amount: 7500,
        raw_data: updatedRaw,
        content_hash: contentHash(updatedRaw),
      });
      const result = await adapter.upsertEntities('conn-1', 'invoice', [updated]);
      expect(result.inserted).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.unchanged).toBe(0);
    });

    it('returns empty array for no entities', async () => {
      const result = await adapter.upsertEntities('conn-1', 'invoice', []);
      expect(result).toEqual({ inserted: 0, updated: 0, unchanged: 0 });
    });

    it('retrieves entities with pagination', async () => {
      const entities = Array.from({ length: 5 }, (_, i) =>
        makeEntity({ external_id: `100${i}` }),
      );
      await adapter.upsertEntities('conn-1', 'invoice', entities);

      const page1 = await adapter.getEntities('conn-1', 'invoice', { page: 1, pageSize: 2 });
      expect(page1).toHaveLength(2);

      const page2 = await adapter.getEntities('conn-1', 'invoice', { page: 2, pageSize: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await adapter.getEntities('conn-1', 'invoice', { page: 3, pageSize: 2 });
      expect(page3).toHaveLength(1);
    });

    it('filters entities by fiscal year', async () => {
      await adapter.upsertEntities('conn-1', 'invoice', [
        makeEntity({ external_id: '1001', fiscal_year: 2024 }),
        makeEntity({ external_id: '1002', fiscal_year: 2023 }),
      ]);

      const result = await adapter.getEntities('conn-1', 'invoice', { fiscalYear: 2024 });
      expect(result).toHaveLength(1);
      expect(result[0]!.external_id).toBe('1001');
    });

    it('filters entities by date range', async () => {
      await adapter.upsertEntities('conn-1', 'invoice', [
        makeEntity({ external_id: '1001', document_date: '2024-01-15' }),
        makeEntity({ external_id: '1002', document_date: '2024-06-15' }),
        makeEntity({ external_id: '1003', document_date: '2024-12-15' }),
      ]);

      const result = await adapter.getEntities('conn-1', 'invoice', {
        fromDate: '2024-02-01',
        toDate: '2024-07-01',
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.external_id).toBe('1002');
    });

    it('counts entities', async () => {
      await adapter.upsertEntities('conn-1', 'invoice', [
        makeEntity({ external_id: '1001' }),
        makeEntity({ external_id: '1002' }),
      ]);
      await adapter.upsertEntities('conn-1', 'customer', [
        makeEntity({ external_id: 'C001', entity_type: 'customer' }),
      ]);

      const totalCount = await adapter.getEntityCount('conn-1');
      expect(totalCount).toBe(3);

      const invoiceCount = await adapter.getEntityCount('conn-1', 'invoice');
      expect(invoiceCount).toBe(2);
    });
  });

  // ============================================
  // Sync State
  // ============================================

  describe('sync state', () => {
    it('returns null for non-existent sync state', async () => {
      const result = await adapter.getSyncState('conn-1', 'invoice');
      expect(result).toBeNull();
    });

    it('creates sync state on first update', async () => {
      await adapter.updateSyncState('conn-1', 'invoice', {
        lastSyncAt: '2024-03-15T10:00:00Z',
        recordsFetched: 100,
      });

      const result = await adapter.getSyncState('conn-1', 'invoice');
      expect(result).not.toBeNull();
      expect(result!.lastSyncAt).toBe('2024-03-15T10:00:00Z');
      expect(result!.recordsFetched).toBe(100);
      expect(result!.lastModifiedCursor).toBeNull();
    });

    it('merges partial updates', async () => {
      await adapter.updateSyncState('conn-1', 'invoice', {
        lastSyncAt: '2024-03-15T10:00:00Z',
        recordsFetched: 100,
      });

      await adapter.updateSyncState('conn-1', 'invoice', {
        lastModifiedCursor: '2024-03-15',
        recordsUpdated: 5,
      });

      const result = await adapter.getSyncState('conn-1', 'invoice');
      expect(result!.lastSyncAt).toBe('2024-03-15T10:00:00Z');
      expect(result!.lastModifiedCursor).toBe('2024-03-15');
      expect(result!.recordsFetched).toBe(100);
      expect(result!.recordsUpdated).toBe(5);
    });
  });

  // ============================================
  // Sync Progress
  // ============================================

  describe('sync progress', () => {
    it('upserts and retrieves sync progress', async () => {
      const progress: SyncProgress = {
        jobId: 'job-1',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'running',
        progress: 50,
        entityResults: [],
        startedAt: '2024-03-15T10:00:00Z',
      };

      await adapter.upsertSyncProgress(progress);
      const result = await adapter.getSyncProgress('job-1');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('running');
      expect(result!.progress).toBe(50);
    });

    it('updates existing sync progress', async () => {
      await adapter.upsertSyncProgress({
        jobId: 'job-1',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'running',
        progress: 50,
        entityResults: [],
        startedAt: '2024-03-15T10:00:00Z',
      });

      await adapter.upsertSyncProgress({
        jobId: 'job-1',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'completed',
        progress: 100,
        entityResults: [
          {
            entityType: 'invoice',
            recordsFetched: 10,
            recordsInserted: 10,
            recordsUpdated: 0,
            recordsUnchanged: 0,
            success: true,
            durationMs: 500,
          },
        ],
        startedAt: '2024-03-15T10:00:00Z',
        completedAt: '2024-03-15T10:01:00Z',
        totalDurationMs: 60000,
      });

      const result = await adapter.getSyncProgress('job-1');
      expect(result!.status).toBe('completed');
      expect(result!.progress).toBe(100);
      expect(result!.entityResults).toHaveLength(1);
    });

    it('returns sync history ordered by startedAt desc', async () => {
      await adapter.upsertSyncProgress({
        jobId: 'job-1',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'completed',
        progress: 100,
        entityResults: [],
        startedAt: '2024-03-14T10:00:00Z',
      });
      await adapter.upsertSyncProgress({
        jobId: 'job-2',
        connectionId: 'conn-1',
        provider: 'fortnox',
        status: 'completed',
        progress: 100,
        entityResults: [],
        startedAt: '2024-03-15T10:00:00Z',
      });

      const history = await adapter.getSyncHistory('conn-1');
      expect(history).toHaveLength(2);
      expect(history[0]!.jobId).toBe('job-2'); // Most recent first
      expect(history[1]!.jobId).toBe('job-1');
    });

    it('returns null for non-existent job', async () => {
      const result = await adapter.getSyncProgress('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // SIE Data
  // ============================================

  describe('SIE data', () => {
    it('stores and retrieves SIE data', async () => {
      const data = makeSIEData();
      const uploadId = await adapter.storeSIEData('conn-1', data);

      expect(uploadId).toBeTruthy();
      expect(typeof uploadId).toBe('string');

      const retrieved = await adapter.getSIEData(uploadId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.connectionId).toBe('conn-1');
      expect(retrieved!.fiscalYear).toBe(2024);
      expect(retrieved!.sieType).toBe(4);
      expect(retrieved!.parsed).toBeDefined();
      expect(retrieved!.kpis).toBeDefined();
    });

    it('overwrites on same (connectionId, fiscalYear, sieType)', async () => {
      const data1 = makeSIEData();
      const id1 = await adapter.storeSIEData('conn-1', data1);

      const data2 = makeSIEData({
        rawContent: '#FLAGGA 0\n#SIETYP 4\n#FNAMN "Updated"',
      });
      const id2 = await adapter.storeSIEData('conn-1', data2);

      // Should reuse same uploadId
      expect(id2).toBe(id1);

      const retrieved = await adapter.getSIEData(id2);
      expect(retrieved!.rawContent).toContain('Updated');
    });

    it('lists SIE uploads for a connection', async () => {
      await adapter.storeSIEData('conn-1', makeSIEData({ fiscalYear: 2023, sieType: 4 }));
      await adapter.storeSIEData('conn-1', makeSIEData({ fiscalYear: 2024, sieType: 4 }));

      const uploads = await adapter.getSIEUploads('conn-1');
      expect(uploads).toHaveLength(2);
      expect(uploads.map((u) => u.fiscalYear).sort()).toEqual([2023, 2024]);
    });

    it('returns null for non-existent SIE data', async () => {
      const result = await adapter.getSIEData('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // Migration idempotency
  // ============================================

  describe('migration', () => {
    it('can be called multiple times without error', async () => {
      await adapter.migrate();
      await adapter.migrate();
      // Should not throw
    });
  });

  // ============================================
  // Consent operations
  // ============================================

  describe('Consent operations', () => {
    function makeConsent(overrides?: Partial<import('../types/consent.js').ConsentRecord>): import('../types/consent.js').ConsentRecord {
      const now = new Date().toISOString();
      return {
        id: 'consent-1',
        tenantId: 'tenant-1',
        name: 'Test Consent',
        status: 0, // ConsentStatus.Created
        provider: 'fortnox',
        orgNumber: '5561234567',
        companyName: 'Test AB',
        etag: 'etag-1',
        createdAt: now,
        updatedAt: now,
        ...overrides,
      };
    }

    function makeTokens(overrides?: Partial<import('../types/consent.js').ConsentTokenRecord>): import('../types/consent.js').ConsentTokenRecord {
      return {
        consentId: 'consent-1',
        provider: 'fortnox',
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-xyz',
        tokenExpiresAt: '2025-12-31T23:59:59Z',
        scopes: 'bookkeeping',
        ...overrides,
      };
    }

    function makeOTC(overrides?: Partial<import('../types/consent.js').OneTimeCode>): import('../types/consent.js').OneTimeCode {
      return {
        code: 'otc-123456',
        consentId: 'consent-1',
        expiresAt: new Date(Date.now() + 600_000).toISOString(), // 10 min from now
        ...overrides,
      };
    }

    // --- upsertConsent: create ---

    it('upsertConsent creates a consent and stores it', async () => {
      const consent = makeConsent();
      await adapter.upsertConsent(consent);

      const result = await adapter.getConsent('consent-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('consent-1');
      expect(result!.tenantId).toBe('tenant-1');
      expect(result!.name).toBe('Test Consent');
      expect(result!.status).toBe(0);
      expect(result!.provider).toBe('fortnox');
      expect(result!.orgNumber).toBe('5561234567');
      expect(result!.companyName).toBe('Test AB');
      expect(result!.etag).toBe('etag-1');
    });

    // --- getConsent ---

    it('getConsent returns null for non-existent consent', async () => {
      const result = await adapter.getConsent('nonexistent');
      expect(result).toBeNull();
    });

    // --- getConsents: list by tenantId ---

    it('getConsents lists consents by tenantId', async () => {
      await adapter.upsertConsent(makeConsent({ id: 'c-1', tenantId: 'tenant-1' }));
      await adapter.upsertConsent(makeConsent({ id: 'c-2', tenantId: 'tenant-1', name: 'Second' }));
      await adapter.upsertConsent(makeConsent({ id: 'c-3', tenantId: 'tenant-2' }));

      const tenant1 = await adapter.getConsents('tenant-1');
      expect(tenant1).toHaveLength(2);

      const tenant2 = await adapter.getConsents('tenant-2');
      expect(tenant2).toHaveLength(1);
      expect(tenant2[0]!.id).toBe('c-3');
    });

    it('getConsents filters by provider', async () => {
      await adapter.upsertConsent(makeConsent({ id: 'c-1', provider: 'fortnox' }));
      await adapter.upsertConsent(makeConsent({ id: 'c-2', provider: 'visma' }));

      const fortnoxOnly = await adapter.getConsents('tenant-1', { provider: 'fortnox' });
      expect(fortnoxOnly).toHaveLength(1);
      expect(fortnoxOnly[0]!.id).toBe('c-1');
    });

    it('getConsents filters by status', async () => {
      await adapter.upsertConsent(makeConsent({ id: 'c-1', status: 0 })); // Created
      await adapter.upsertConsent(makeConsent({ id: 'c-2', status: 1 })); // Accepted

      const accepted = await adapter.getConsents('tenant-1', { status: 1 });
      expect(accepted).toHaveLength(1);
      expect(accepted[0]!.id).toBe('c-2');
    });

    // --- upsertConsent: update ---

    it('upsertConsent updates an existing consent', async () => {
      await adapter.upsertConsent(makeConsent());

      const updated = makeConsent({
        status: 1, // Accepted
        etag: 'etag-2',
        updatedAt: new Date().toISOString(),
      });
      await adapter.upsertConsent(updated);

      const result = await adapter.getConsent('consent-1');
      expect(result!.status).toBe(1);
      expect(result!.etag).toBe('etag-2');
      // Name should remain the same since we passed the same value
      expect(result!.name).toBe('Test Consent');
    });

    // --- deleteConsent: cascades to tokens + OTCs ---

    it('deleteConsent removes consent and cascades to tokens and OTCs', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.storeConsentTokens(makeTokens());
      await adapter.createOneTimeCode(makeOTC());

      // Verify everything exists before delete
      expect(await adapter.getConsent('consent-1')).not.toBeNull();
      expect(await adapter.getConsentTokens('consent-1')).not.toBeNull();

      await adapter.deleteConsent('consent-1');

      expect(await adapter.getConsent('consent-1')).toBeNull();
      expect(await adapter.getConsentTokens('consent-1')).toBeNull();
      // OTC should also be gone — validateOneTimeCode should return null
      const otcResult = await adapter.validateOneTimeCode('otc-123456');
      expect(otcResult).toBeNull();
    });

    // --- storeConsentTokens ---

    it('storeConsentTokens stores tokens for a consent', async () => {
      await adapter.upsertConsent(makeConsent());
      const tokens = makeTokens();
      await adapter.storeConsentTokens(tokens);

      const result = await adapter.getConsentTokens('consent-1');
      expect(result).not.toBeNull();
      expect(result!.consentId).toBe('consent-1');
      expect(result!.provider).toBe('fortnox');
      expect(result!.accessToken).toBe('access-token-abc');
      expect(result!.refreshToken).toBe('refresh-token-xyz');
      expect(result!.tokenExpiresAt).toBe('2025-12-31T23:59:59Z');
      expect(result!.scopes).toBe('bookkeeping');
    });

    it('storeConsentTokens updates existing tokens', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.storeConsentTokens(makeTokens());

      await adapter.storeConsentTokens(makeTokens({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }));

      const result = await adapter.getConsentTokens('consent-1');
      expect(result!.accessToken).toBe('new-access-token');
      expect(result!.refreshToken).toBe('new-refresh-token');
    });

    // --- getConsentTokens ---

    it('getConsentTokens returns null when no tokens stored', async () => {
      const result = await adapter.getConsentTokens('nonexistent');
      expect(result).toBeNull();
    });

    // --- deleteConsentTokens ---

    it('deleteConsentTokens removes tokens for a consent', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.storeConsentTokens(makeTokens());

      expect(await adapter.getConsentTokens('consent-1')).not.toBeNull();

      await adapter.deleteConsentTokens('consent-1');

      expect(await adapter.getConsentTokens('consent-1')).toBeNull();
    });

    // --- createOneTimeCode ---

    it('createOneTimeCode creates a code', async () => {
      await adapter.upsertConsent(makeConsent());
      const otc = makeOTC();
      await adapter.createOneTimeCode(otc);

      // Validate should find it
      const result = await adapter.validateOneTimeCode('otc-123456');
      expect(result).not.toBeNull();
      expect(result!.code).toBe('otc-123456');
      expect(result!.consentId).toBe('consent-1');
      expect(result!.usedAt).toBeTruthy();
    });

    // --- validateOneTimeCode ---

    it('validateOneTimeCode marks a valid code as used', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.createOneTimeCode(makeOTC());

      const result = await adapter.validateOneTimeCode('otc-123456');
      expect(result).not.toBeNull();
      expect(result!.usedAt).toBeTruthy();

      // Second validation should fail (already used)
      const second = await adapter.validateOneTimeCode('otc-123456');
      expect(second).toBeNull();
    });

    it('validateOneTimeCode returns null for expired code', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.createOneTimeCode(makeOTC({
        expiresAt: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
      }));

      const result = await adapter.validateOneTimeCode('otc-123456');
      expect(result).toBeNull();
    });

    it('validateOneTimeCode returns null for already-used code', async () => {
      await adapter.upsertConsent(makeConsent());
      await adapter.createOneTimeCode(makeOTC({
        usedAt: new Date().toISOString(),
      }));

      const result = await adapter.validateOneTimeCode('otc-123456');
      expect(result).toBeNull();
    });

    it('validateOneTimeCode returns null for non-existent code', async () => {
      const result = await adapter.validateOneTimeCode('does-not-exist');
      expect(result).toBeNull();
    });
  });
});
