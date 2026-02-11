import { VISMA_AUTH_URL, VISMA_TOKEN_URL, VISMA_REVOKE_URL } from './config.js';
import type { VismaOAuthConfig, VismaTokenResponse } from './types.js';

/** Default scopes for Visma eAccounting API */
const DEFAULT_SCOPES = [
  'ea:api',
  'offline_access',
  'ea:sales_readonly',
  'ea:accounting_readonly',
  'ea:purchase_readonly',
];

/** Service GUID that filters to eAccounting companies */
const EACCOUNTING_ACR_VALUE = 'service:44643EB1-3F76-4C1C-A672-402AE8085934';

/**
 * Build the Visma OAuth2 authorization URL.
 */
export function buildVismaAuthUrl(
  config: VismaOAuthConfig,
  options?: { scopes?: string[]; state?: string; acrValues?: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    acr_values: options?.acrValues ?? EACCOUNTING_ACR_VALUE,
  });

  const scopes = options?.scopes?.length ? options.scopes : DEFAULT_SCOPES;
  params.set('scope', scopes.join(' '));

  if (options?.state) {
    params.set('state', options.state);
  }

  return `${VISMA_AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(config: VismaOAuthConfig): string {
  const encoded = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeVismaCode(
  config: VismaOAuthConfig,
  code: string,
): Promise<VismaTokenResponse> {
  const response = await fetch(VISMA_TOKEN_URL, {
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
    throw new Error(`Visma token exchange failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<VismaTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshVismaToken(
  config: VismaOAuthConfig,
  refreshToken: string,
): Promise<VismaTokenResponse> {
  const response = await fetch(VISMA_TOKEN_URL, {
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
    throw new Error(`Visma token refresh failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<VismaTokenResponse>;
}

/**
 * Revoke a refresh token.
 */
export async function revokeVismaToken(
  config: VismaOAuthConfig,
  refreshToken: string,
): Promise<boolean> {
  const response = await fetch(VISMA_REVOKE_URL, {
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
