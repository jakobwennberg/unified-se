import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter, contentHash } from '@arcim-sync/core';
import type { CanonicalEntityRecord } from '@arcim-sync/core';
import { createServer } from '../app.js';

describe('entities routes', () => {
  let db: SQLiteAdapter;
  let app: ReturnType<typeof createServer>;
  const connId = 'ent-conn-1';

  function makeInvoice(id: string, overrides: Partial<CanonicalEntityRecord> = {}): CanonicalEntityRecord {
    const raw = { DocumentNumber: id, Total: 1000 };
    return {
      external_id: id,
      entity_type: 'invoice',
      provider: 'fortnox',
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
      ...overrides,
    };
  }

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    app = createServer({ db });

    // Seed connection
    await db.upsertConnection({
      connectionId: connId,
      provider: 'fortnox',
      displayName: 'Test AB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed entities
    await db.upsertEntities(connId, 'invoice', [
      makeInvoice('INV-1'),
      makeInvoice('INV-2', { amount: 2000, document_date: '2024-04-01' }),
      makeInvoice('INV-3', { amount: 3000, fiscal_year: 2023 }),
    ]);
    await db.upsertEntities(connId, 'customer', [
      {
        external_id: 'C100',
        entity_type: 'customer',
        provider: 'fortnox',
        fiscal_year: null,
        document_date: null,
        due_date: null,
        counterparty_number: 'C100',
        counterparty_name: 'Acme AB',
        amount: null,
        currency: 'SEK',
        status: null,
        raw_data: { CustomerNumber: 'C100' },
        last_modified: null,
        content_hash: contentHash({ CustomerNumber: 'C100' }),
      },
    ]);
  });

  it('GET /entities/:connId/:entityType lists with pagination', async () => {
    const res = await app.request(`/entities/${connId}/invoice?page=1&pageSize=2`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBe(3);
  });

  it('GET /entities/:connId/:entityType filters by fiscalYear', async () => {
    const res = await app.request(`/entities/${connId}/invoice?fiscalYear=2024`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });

  it('returns 400 for invalid entity type', async () => {
    const res = await app.request(`/entities/${connId}/bogus`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid entity type');
  });

  it('GET /entities/:connId/count returns total count', async () => {
    const res = await app.request(`/entities/${connId}/count`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(4); // 3 invoices + 1 customer
  });

  it('GET /entities/:connId/count?entityType=invoice counts by type', async () => {
    const res = await app.request(`/entities/${connId}/count?entityType=invoice`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3);
  });

  it('returns empty results for connection with no entities', async () => {
    const res = await app.request(`/entities/nonexistent/invoice`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});
