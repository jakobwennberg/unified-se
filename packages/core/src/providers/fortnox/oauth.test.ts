import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildFortnoxAuthUrl,
  exchangeFortnoxCode,
  refreshFortnoxToken,
  revokeFortnoxToken,
} from './oauth.js';
import type { FortnoxOAuthConfig } from './types.js';

const originalFetch = globalThis.fetch;

const config: FortnoxOAuthConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://myapp.example.com/callback',
};

describe('Fortnox OAuth', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('buildFortnoxAuthUrl', () => {
    it('builds correct URL with required params', () => {
      const url = buildFortnoxAuthUrl(config);

      expect(url).toContain('https://apps.fortnox.se/oauth-v1/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
    });

    it('includes scopes when provided', () => {
      const url = buildFortnoxAuthUrl(config, {
        scopes: ['companyinformation', 'invoices'],
      });

      expect(url).toContain('scope=companyinformation+invoices');
    });

    it('includes state when provided', () => {
      const url = buildFortnoxAuthUrl(config, { state: 'abc123' });
      expect(url).toContain('state=abc123');
    });

    it('omits scope and state when not provided', () => {
      const url = buildFortnoxAuthUrl(config);
      expect(url).not.toContain('scope=');
      expect(url).not.toContain('state=');
    });
  });

  describe('exchangeFortnoxCode', () => {
    it('sends correct POST with Basic auth', async () => {
      const tokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'companyinformation',
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(tokenResponse), { status: 200 }),
      );

      const result = await exchangeFortnoxCode(config, 'auth-code-123');

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://apps.fortnox.se/oauth-v1/token');
      expect(init.method).toBe('POST');

      // Verify Basic auth header
      const expectedBasic = Buffer.from('test-client-id:test-client-secret').toString('base64');
      expect(init.headers.Authorization).toBe(`Basic ${expectedBasic}`);

      // Verify body
      const body = init.body as string;
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth-code-123');
      expect(body).toContain('redirect_uri=');
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('invalid_grant', { status: 400 }),
      );

      await expect(exchangeFortnoxCode(config, 'bad-code')).rejects.toThrow(
        'Fortnox token exchange failed',
      );
    });
  });

  describe('refreshFortnoxToken', () => {
    it('sends correct refresh request', async () => {
      const tokenResponse = {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'companyinformation',
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(tokenResponse), { status: 200 }),
      );

      const result = await refreshFortnoxToken(config, 'old-refresh-token');
      expect(result.access_token).toBe('refreshed-token');

      const body = fetchMock.mock.calls[0]![1].body as string;
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=old-refresh-token');
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('invalid_token', { status: 400 }),
      );

      await expect(
        refreshFortnoxToken(config, 'expired-refresh'),
      ).rejects.toThrow('Fortnox token refresh failed');
    });
  });

  describe('revokeFortnoxToken', () => {
    it('returns true on success', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

      const result = await revokeFortnoxToken(config, 'some-refresh-token');
      expect(result).toBe(true);

      const body = fetchMock.mock.calls[0]![1].body as string;
      expect(body).toContain('token=some-refresh-token');
      expect(body).toContain('token_type_hint=refresh_token');
    });

    it('returns false on error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('error', { status: 400 }));

      const result = await revokeFortnoxToken(config, 'bad-token');
      expect(result).toBe(false);
    });
  });
});
