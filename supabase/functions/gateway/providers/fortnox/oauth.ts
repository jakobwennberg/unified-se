import { FORTNOX_AUTH_URL, FORTNOX_TOKEN_URL } from './config.ts';
import type { OAuthConfig, TokenResponse } from '../types.ts';

const DEFAULT_SCOPES = [
  'companyinformation',
  'invoice',
  'supplierinvoice',
  'customer',
  'supplier',
  'bookkeeping',
];

export function buildFortnoxAuthUrl(
  config: OAuthConfig,
  options?: { scopes?: string[]; state?: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    access_type: 'offline',
  });

  const scopes = options?.scopes?.length ? options.scopes : DEFAULT_SCOPES;
  params.set('scope', scopes.join(' '));

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(config: OAuthConfig): string {
  const encoded = btoa(`${config.clientId}:${config.clientSecret}`);
  return `Basic ${encoded}`;
}

export async function exchangeFortnoxCode(
  config: OAuthConfig,
  code: string,
): Promise<TokenResponse> {
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

  return response.json() as Promise<TokenResponse>;
}

export async function refreshFortnoxToken(
  config: OAuthConfig,
  refreshToken: string,
): Promise<TokenResponse> {
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

  return response.json() as Promise<TokenResponse>;
}

export async function revokeFortnoxToken(
  config: OAuthConfig,
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
