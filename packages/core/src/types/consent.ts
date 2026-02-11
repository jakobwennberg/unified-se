import type { ProviderName } from './provider.js';

/** Consent state machine: Created(0) → Accepted(1) → Revoked(2) or Inactive(3) */
export enum ConsentStatus {
  Created = 0,
  Accepted = 1,
  Revoked = 2,
  Inactive = 3,
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  name: string;
  status: ConsentStatus;
  provider: ProviderName;
  orgNumber?: string;
  companyName?: string;
  systemSettingsId?: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface ConsentTokenRecord {
  consentId: string;
  provider: ProviderName;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes?: string;
  encryptedAt?: string;
}

export interface OneTimeCode {
  code: string;
  consentId: string;
  expiresAt: string;
  usedAt?: string;
}

export interface CreateConsentInput {
  name: string;
  provider: ProviderName;
  orgNumber?: string;
  companyName?: string;
  systemSettingsId?: string;
}
