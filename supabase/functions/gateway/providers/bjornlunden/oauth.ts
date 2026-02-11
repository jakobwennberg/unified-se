import type { TokenResponse } from '../types.ts';
import { postForm } from './http.ts';

const BL_AUTH_URL = 'https://apigateway.blinfo.se/auth/oauth/v2/token';

/**
 * Fetch an access token using OAuth 2.0 Client Credentials grant.
 * Björn Lunden uses server-to-server auth — no user redirect, no refresh_token.
 *
 * Uses Node's https module (via http.ts) because the BL server's TLS ciphers
 * are incompatible with Deno's rustls stack.
 */
export async function fetchBjornLundenToken(
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const res = await postForm(BL_AUTH_URL, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Björn Lunden token request failed: ${res.status} ${JSON.stringify(res.data)}`);
  }

  const data = res.data;
  return {
    access_token: data.access_token as string,
    refresh_token: '', // Client credentials grant — no refresh token
    token_type: (data.token_type as string) ?? 'Bearer',
    expires_in: (data.expires_in as number) ?? 3600,
  };
}

/**
 * Acquire a new token using stored client credentials from environment.
 * Used both during onboarding (storeBjornLundenToken) and on token expiry refresh.
 */
export async function refreshBjornLundenToken(): Promise<TokenResponse> {
  const clientId = Deno.env.get('BJORN_LUNDEN_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('BJORN_LUNDEN_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) {
    throw new Error('BJORN_LUNDEN_CLIENT_ID and BJORN_LUNDEN_CLIENT_SECRET must be set');
  }
  return fetchBjornLundenToken(clientId, clientSecret);
}

/**
 * Alias for refreshBjornLundenToken — used during onboarding callback.
 */
export const storeBjornLundenToken = refreshBjornLundenToken;
