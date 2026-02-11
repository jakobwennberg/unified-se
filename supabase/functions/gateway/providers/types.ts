import type { ResourceType } from '../types/dto.ts';

export type ProviderName = 'fortnox' | 'visma' | 'briox';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ResourceConfig {
  listEndpoint: string;
  detailEndpoint: string;
  idField: string;
  mapper: (raw: Record<string, unknown>) => unknown;
  singleton?: boolean;
}

export interface FortnoxResourceConfig extends ResourceConfig {
  listKey: string;
  detailKey: string;
  supportsLastModified: boolean;
}

export interface VismaResourceConfig extends ResourceConfig {
  supportsModifiedFilter: boolean;
  modifiedField?: string;
}

export interface BrioxResourceConfig extends ResourceConfig {
  /** The key inside `data` that contains the array of items (e.g. "invoices", "customers") */
  listKey: string;
  supportsModifiedFilter: boolean;
  /** Whether this endpoint is scoped by financial year (e.g. /journal/{year}) */
  yearScoped?: boolean;
}
