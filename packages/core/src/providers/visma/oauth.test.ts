import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildVismaAuthUrl,
  exchangeVismaCode,
  refreshVismaToken,
  revokeVismaToken,
} from './oauth.js';
import type { VismaOAuthConfig } from './types.js';

const originalFetch = globalThis.fetch;

const config: VismaOAuthConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://myapp.example.com/callback',
};

describe('Visma OAuth', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('buildVismaAuthUrl', () => {
    it('builds correct URL with required params and default scopes', () => {
      const url = buildVismaAuthUrl(config);

      expect(url).toContain('https://identity.vismaonline.com/connect/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=ea%3Aapi+offline_access+ea%3Asales_readonly+ea%3Aaccounting_readonly+ea%3Apurchase_readonly');
    });

    it('includes acr_values for eAccounting service', () => {
      const url = buildVismaAuthUrl(config);
      expect(url).toContain('acr_values=service%3A44643EB1-3F76-4C1C-A672-402AE8085934');
    });

    it('includes custom scopes and state when provided', () => {
      const url = buildVismaAuthUrl(config, {
        scopes: ['ea:api', 'offline_access'],
        state: 'abc123',
      });

      expect(url).toContain('scope=ea%3Aapi+offline_access');
      expect(url).toContain('state=abc123');
    });

    it('allows custom acr_values', () => {
      const url = buildVismaAuthUrl(config, { acrValues: 'custom:value' });
      expect(url).toContain('acr_values=custom%3Avalue');
    });
  });

  describe('exchangeVismaCode', () => {
    it('sends correct POST with Basic auth', async () => {
      const tokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(tokenResponse), { status: 200 }),
      );

      const result = await exchangeVismaCode(config, 'auth-code-123');

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://identity.vismaonline.com/connect/token');
      expect(init.method).toBe('POST');

      const expectedBasic = Buffer.from('test-client-id:test-client-secret').toString('base64');
      expect(init.headers.Authorization).toBe(`Basic ${expectedBasic}`);

      const body = init.body as string;
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth-code-123');
      expect(body).toContain('redirect_uri=');
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('invalid_grant', { status: 400 }),
      );

      await expect(exchangeVismaCode(config, 'bad-code')).rejects.toThrow(
        'Visma token exchange failed',
      );
    });
  });

  describe('refreshVismaToken', () => {
    it('sends correct refresh request', async () => {
      const tokenResponse = {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(tokenResponse), { status: 200 }),
      );

      const result = await refreshVismaToken(config, 'old-refresh-token');
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
        refreshVismaToken(config, 'expired-refresh'),
      ).rejects.toThrow('Visma token refresh failed');
    });
  });

  describe('revokeVismaToken', () => {
    it('returns true on success and posts to revocation endpoint', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

      const result = await revokeVismaToken(config, 'some-refresh-token');
      expect(result).toBe(true);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://identity.vismaonline.com/connect/revocation');

      const body = init.body as string;
      expect(body).toContain('token=some-refresh-token');
      expect(body).toContain('token_type_hint=refresh_token');
    });

    it('returns false on error', async () => {
      fetchMock.mockResolvedValueOnce(new Response('error', { status: 400 }));

      const result = await revokeVismaToken(config, 'bad-token');
      expect(result).toBe(false);
    });
  });
});
