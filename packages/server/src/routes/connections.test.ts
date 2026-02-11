import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter } from '@arcim-sync/core';
import { createServer } from '../app.js';

describe('connections routes', () => {
  let db: SQLiteAdapter;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    app = createServer({ db });
  });

  const makeConnection = (overrides: Record<string, unknown> = {}) => ({
    connectionId: 'conn-1',
    provider: 'fortnox',
    displayName: 'Test AB',
    ...overrides,
  });

  it('POST /connections creates a connection (201)', async () => {
    const res = await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.connectionId).toBe('conn-1');
    expect(body.provider).toBe('fortnox');
    expect(body.displayName).toBe('Test AB');
    expect(body.createdAt).toBeDefined();
  });

  it('POST /connections upserts an existing connection', async () => {
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });

    const res = await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection({ displayName: 'Updated AB' })),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.displayName).toBe('Updated AB');
  });

  it('GET /connections lists all connections', async () => {
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection({ connectionId: 'conn-2', provider: 'visma' })),
    });

    const res = await app.request('/connections');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('GET /connections?provider=fortnox filters by provider', async () => {
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection({ connectionId: 'conn-2', provider: 'visma' })),
    });

    const res = await app.request('/connections?provider=fortnox');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].provider).toBe('fortnox');
  });

  it('GET /connections/:id returns a connection', async () => {
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });

    const res = await app.request('/connections/conn-1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connectionId).toBe('conn-1');
  });

  it('GET /connections/:id returns 404 when not found', async () => {
    const res = await app.request('/connections/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Connection not found');
  });

  it('DELETE /connections/:id deletes a connection', async () => {
    await app.request('/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeConnection()),
    });

    const res = await app.request('/connections/conn-1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);

    // Verify it's gone
    const getRes = await app.request('/connections/conn-1');
    expect(getRes.status).toBe(404);
  });

  it('DELETE /connections/:id returns 404 when not found', async () => {
    const res = await app.request('/connections/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Connection not found');
  });
});
