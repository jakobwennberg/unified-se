import type { DatabaseAdapter, Logger, ConsentRecord, ProviderCredentials } from '@arcim-sync/core';

/** Hono environment type for V1 consent-based routes */
export type AppEnv = {
  Variables: {
    tenantId: string;
    consent: ConsentRecord;
    credentials: ProviderCredentials;
  };
};

export interface FortnoxOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface VismaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface ServerOptions {
  db: DatabaseAdapter;
  /** Enables bearer auth when set */
  apiKey?: string;
  /** Falls back to noopLogger */
  logger?: Logger;
  /** Enables /auth/fortnox/* when set */
  fortnoxOAuth?: FortnoxOAuthConfig;
  /** Enables /auth/visma/* when set */
  vismaOAuth?: VismaOAuthConfig;
  /** AES encryption key for token-at-rest encryption */
  tokenEncryptionKey?: string;
  /** Deployment mode: self-hosted allows pass-per-call tokens */
  mode?: 'self-hosted' | 'hosted';
  /** Base URL for the onboarding/consent UI */
  onboardingBaseUrl?: string;
  /** Rate limiting configuration for V1 API routes */
  rateLimits?: { maxRequests: number; windowMs: number };
}
