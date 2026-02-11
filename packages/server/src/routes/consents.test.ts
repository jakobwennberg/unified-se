import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter } from '@arcim-sync/core';
import { createServer } from '../app.js';

describe('consent routes', () => {
  let db: SQLiteAdapter;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    app = createServer({ db });
  });

  const makeConsent = (overrides: Record<string, unknown> = {}) => ({
    name: 'Test Consent',
    provider: 'fortnox',
    orgNumber: '556677-8899',
    companyName: 'Test AB',
    ...overrides,
  });

  // ── POST /api/v1/consents ──

  describe('POST /api/v1/consents', () => {
    it('creates a consent and returns 201 with id', async () => {
      const res = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test Consent');
      expect(body.provider).toBe('fortnox');
      expect(body.orgNumber).toBe('556677-8899');
      expect(body.companyName).toBe('Test AB');
      expect(body.status).toBe(0); // ConsentStatus.Created
      expect(body.etag).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('returns 400 for missing name', async () => {
      const res = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'fortnox' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request body');
    });

    it('returns 400 for missing provider', async () => {
      const res = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request body');
    });

    it('returns 400 for invalid provider value', async () => {
      const res = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent({ provider: 'invalid-provider' })),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request body');
    });
  });

  // ── GET /api/v1/consents ──

  describe('GET /api/v1/consents', () => {
    it('returns empty data array initially', async () => {
      const res = await app.request('/api/v1/consents');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(0);
    });

    it('lists created consents', async () => {
      await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent({ name: 'Second Consent', provider: 'visma' })),
      });

      const res = await app.request('/api/v1/consents');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
    });
  });

  // ── GET /api/v1/consents/:id ──

  describe('GET /api/v1/consents/:id', () => {
    it('returns a consent with ETag header', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('ETag')).toBe(created.etag);
      const body = await res.json();
      expect(body.id).toBe(created.id);
      expect(body.name).toBe('Test Consent');
    });

    it('returns 404 for non-existent consent', async () => {
      const res = await app.request('/api/v1/consents/non-existent-id');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Consent not found');
    });
  });

  // ── PATCH /api/v1/consents/:id ──

  describe('PATCH /api/v1/consents/:id', () => {
    it('updates a consent and returns a new ETag', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': created.etag,
        },
        body: JSON.stringify({ name: 'Updated Consent' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe('Updated Consent');
      expect(body.etag).not.toBe(created.etag);

      const newETag = res.headers.get('ETag');
      expect(newETag).toBeDefined();
      expect(newETag).toBe(body.etag);
    });

    it('returns 412 on ETag mismatch', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'wrong-etag-value',
        },
        body: JSON.stringify({ name: 'Should Fail' }),
      });
      expect(res.status).toBe(412);
      const body = await res.json();
      expect(body.error).toContain('ETag mismatch');
    });

    it('returns 404 for non-existent consent', async () => {
      const res = await app.request('/api/v1/consents/non-existent-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Consent not found');
    });

    it('allows update without If-Match header', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No ETag Check' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('No ETag Check');
    });
  });

  // ── DELETE /api/v1/consents/:id ──

  describe('DELETE /api/v1/consents/:id', () => {
    it('deletes a consent', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify it is gone
      const getRes = await app.request(`/api/v1/consents/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for non-existent consent', async () => {
      const res = await app.request('/api/v1/consents/non-existent-id', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Consent not found');
    });
  });

  // ── POST /api/v1/consents/:id/otc ──

  describe('POST /api/v1/consents/:id/otc', () => {
    it('generates a one-time code', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}/otc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.code).toBeDefined();
      expect(typeof body.code).toBe('string');
      expect(body.code.length).toBe(16);
      expect(body.consentId).toBe(created.id);
      expect(body.expiresAt).toBeDefined();
    });

    it('returns 404 for non-existent consent', async () => {
      const res = await app.request('/api/v1/consents/non-existent-id/otc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Consent not found');
    });

    it('accepts custom expiresInMinutes', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/v1/consents/${created.id}/otc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInMinutes: 30 }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      // The expiry should be roughly 30 minutes from now
      const expiresAt = new Date(body.expiresAt).getTime();
      const expectedMin = Date.now() + 29 * 60_000;
      const expectedMax = Date.now() + 31 * 60_000;
      expect(expiresAt).toBeGreaterThan(expectedMin);
      expect(expiresAt).toBeLessThan(expectedMax);
    });
  });

  // ── POST /api/v1/consents/auth/token ──

  describe('POST /api/v1/consents/auth/token', () => {
    async function createConsentAndOTC() {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const consent = await createRes.json();

      const otcRes = await app.request(`/api/v1/consents/${consent.id}/otc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const otc = await otcRes.json();

      return { consent, otc };
    }

    it('exchanges OTC and tokens, sets consent to Accepted', async () => {
      const { consent, otc } = await createConsentAndOTC();

      const res = await app.request('/api/v1/consents/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: otc.code,
          consentId: consent.id,
          provider: 'fortnox',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.consentId).toBe(consent.id);

      // Verify consent status was updated to Accepted (1)
      const getRes = await app.request(`/api/v1/consents/${consent.id}`);
      const updated = await getRes.json();
      expect(updated.status).toBe(1); // ConsentStatus.Accepted
    });

    it('returns 400 for invalid body (missing required fields)', async () => {
      const res = await app.request('/api/v1/consents/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'some-code' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request body');
    });

    it('returns 401 for invalid one-time code', async () => {
      const createRes = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent()),
      });
      const consent = await createRes.json();

      const res = await app.request('/api/v1/consents/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'invalid-code',
          consentId: consent.id,
          provider: 'fortnox',
          accessToken: 'test-access-token',
        }),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid or expired');
    });

    it('returns 400 when OTC consentId does not match', async () => {
      const { otc } = await createConsentAndOTC();

      // Create a second consent
      const createRes2 = await app.request('/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeConsent({ name: 'Other Consent' })),
      });
      const consent2 = await createRes2.json();

      const res = await app.request('/api/v1/consents/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: otc.code,
          consentId: consent2.id, // Wrong consent — OTC belongs to first consent
          provider: 'fortnox',
          accessToken: 'test-access-token',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('does not match consent');
    });
  });
});
