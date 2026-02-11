import { FORTNOX_AUTH_URL, FORTNOX_TOKEN_URL } from './config.js';
import type { FortnoxOAuthConfig, FortnoxTokenResponse } from './types.js';

/**
 * Build the Fortnox OAuth2 authorization URL.
 */
export function buildFortnoxAuthUrl(
  config: FortnoxOAuthConfig,
  options?: { scopes?: string[]; state?: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    access_type: 'offline',
  });

  if (options?.scopes?.length) {
    params.set('scope', options.scopes.join(' '));
  }

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(config: FortnoxOAuthConfig): string {
  const encoded = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeFortnoxCode(
  config: FortnoxOAuthConfig,
  code: string,
): Promise<FortnoxTokenResponse> {
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Fortnox token exchange failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<FortnoxTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshFortnoxToken(
  config: FortnoxOAuthConfig,
  refreshToken: string,
): Promise<FortnoxTokenResponse> {
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Fortnox token refresh failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<FortnoxTokenResponse>;
}

/**
 * Revoke a refresh token.
 */
export async function revokeFortnoxToken(
  config: FortnoxOAuthConfig,
  refreshToken: string,
): Promise<boolean> {
  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(config),
    },
    body: new URLSearchParams({
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }).toString(),
  });

  return response.ok;
}
