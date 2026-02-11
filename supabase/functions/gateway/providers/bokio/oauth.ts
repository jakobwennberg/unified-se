import type { TokenResponse } from '../types.ts';

/**
 * Bokio uses private integration API tokens — no OAuth flow.
 * The user pastes their API token directly. This helper wraps it
 * in a TokenResponse shape for compatibility with the consent token storage.
 */
export function storeBokioToken(apiToken: string): TokenResponse {
  return {
    access_token: apiToken,
    refresh_token: '',
    token_type: 'Bearer',
    expires_in: 0, // Private tokens don't expire
  };
}
