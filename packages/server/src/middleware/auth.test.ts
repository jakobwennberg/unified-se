import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { bearerAuth } from './auth.js';

function createTestApp(apiKey?: string) {
  const app = new Hono();
  if (apiKey) {
    app.use('*', bearerAuth(apiKey));
  }
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/test', (c) => c.json({ data: 'secret' }));
  return app;
}

describe('bearerAuth middleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = createTestApp('my-secret-key');
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Missing Authorization header');
  });

  it('returns 401 when token is wrong', async () => {
    const app = createTestApp('my-secret-key');
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid API key');
  });

  it('passes request through with valid token', async () => {
    const app = createTestApp('my-secret-key');
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer my-secret-key' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBe('secret');
  });

  it('skips auth for /health', async () => {
    const app = createTestApp('my-secret-key');
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('allows all requests when no apiKey (middleware not mounted)', async () => {
    const app = createTestApp(); // no apiKey → no middleware
    const res = await app.request('/test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBe('secret');
  });
});
