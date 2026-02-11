import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SQLiteAdapter } from '@arcim-sync/core';
import { createServer } from '../app.js';

describe('auth routes', () => {
  let db: SQLiteAdapter;
  let originalFetch: typeof globalThis.fetch;

  const fortnoxOAuth = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  };

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GET /auth/fortnox/url returns authorization URL', async () => {
    const app = createServer({ db, fortnoxOAuth });
    const res = await app.request('/auth/fortnox/url');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('client_id=test-client-id');
    expect(body.url).toContain('redirect_uri=');
  });

  it('GET /auth/fortnox/url with scopes and state', async () => {
    const app = createServer({ db, fortnoxOAuth });
    const res = await app.request('/auth/fortnox/url?scopes=bookkeeping,invoices&state=abc123');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('scope=bookkeeping+invoices');
    expect(body.url).toContain('state=abc123');
  });

  it('POST /auth/fortnox/exchange exchanges code for tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'at-123',
          refresh_token: 'rt-456',
          token_type: 'bearer',
          expires_in: 3600,
          scope: 'bookkeeping',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock;

    const app = createServer({ db, fortnoxOAuth });
    const res = await app.request('/auth/fortnox/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'auth-code-xyz' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe('at-123');
    expect(body.refresh_token).toBe('rt-456');
  });

  it('POST /auth/fortnox/refresh refreshes token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'new-at',
          refresh_token: 'new-rt',
          token_type: 'bearer',
          expires_in: 3600,
          scope: 'bookkeeping',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock;

    const app = createServer({ db, fortnoxOAuth });
    const res = await app.request('/auth/fortnox/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'old-rt' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe('new-at');
  });

  it('POST /auth/fortnox/revoke revokes token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    globalThis.fetch = fetchMock;

    const app = createServer({ db, fortnoxOAuth });
    const res = await app.request('/auth/fortnox/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'rt-to-revoke' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toBe(true);
  });

  it('returns 501 when fortnoxOAuth config is not provided', async () => {
    const app = createServer({ db }); // no fortnoxOAuth
    const res = await app.request('/auth/fortnox/url');
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.error).toBe('Fortnox OAuth not configured');
  });
});
