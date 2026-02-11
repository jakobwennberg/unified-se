import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter } from '@arcim-sync/core';
import { createServer } from './app.js';

describe('createServer', () => {
  let db: SQLiteAdapter;

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
  });

  it('health check returns 200 with status ok', async () => {
    const app = createServer({ db });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('creates server with all options', async () => {
    const app = createServer({
      db,
      apiKey: 'test-key',
      fortnoxOAuth: {
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'http://localhost/callback',
      },
    });

    // Health should work without auth
    const healthRes = await app.request('/health');
    expect(healthRes.status).toBe(200);

    // Other routes require auth
    const connRes = await app.request('/connections');
    expect(connRes.status).toBe(401);

    // With auth, routes work
    const authedRes = await app.request('/connections', {
      headers: { Authorization: 'Bearer test-key' },
    });
    expect(authedRes.status).toBe(200);
  });

  it('creates server with minimal options (no auth)', async () => {
    const app = createServer({ db });

    // Routes should work without auth
    const res = await app.request('/connections');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
