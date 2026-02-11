import { z } from 'zod';
import type { EntityType } from './entity.js';

export const ProviderNameSchema = z.enum([
  'fortnox',
  'visma',
  'briox',
  'bokio',
  'bjornlunden',
]);

export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const AuthTypeSchema = z.enum([
  'oauth2',
  'api_token',
  'client_credentials',
]);

export type AuthType = z.infer<typeof AuthTypeSchema>;

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface ProviderCapabilities {
  name: ProviderName;
  displayName: string;
  supportedEntityTypes: EntityType[];
  supportsSIE: boolean;
  sieTypes: (1 | 2 | 3 | 4)[];
  supportsIncrementalSync: boolean;
  incrementalSyncEntities: EntityType[];
  authType: AuthType;
  rateLimits: RateLimitConfig;
}

/**
 * Credentials passed by the consumer on each call.
 * The package never stores tokens — the consumer manages auth.
 */
export interface ProviderCredentials {
  /** OAuth2 access token or API token */
  accessToken: string;
  /** Provider-specific additional credentials */
  [key: string]: unknown;
}

export interface CompanyInfo {
  companyName: string;
  organizationNumber: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  raw: Record<string, unknown>;
}

export interface FinancialYear {
  id: string | number;
  fromDate: string;
  toDate: string;
  /** Fiscal year number, e.g. 2024 */
  year: number;
}
