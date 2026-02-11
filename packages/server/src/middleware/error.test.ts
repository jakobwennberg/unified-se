import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from './error.js';

describe('errorHandler middleware', () => {
  it('returns 500 JSON for thrown errors', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/blow-up', () => {
      throw new Error('Something broke');
    });

    const res = await app.request('/blow-up');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Something broke');
  });

  it('returns error shape matching spec', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/coded', () => {
      const err = new Error('Not found') as Error & { code: string };
      err.code = 'NOT_FOUND';
      throw err;
    });

    const res = await app.request('/coded');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid JSON body', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.post('/data', async (c) => {
      await c.req.json();
      return c.json({ ok: true });
    });

    const res = await app.request('/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json }',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON body');
  });
});
