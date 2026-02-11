import { z } from 'zod';
import { ProviderNameSchema } from '@arcim-sync/core';

// ── Consents ──

export const CreateConsentBody = z.object({
  name: z.string().min(1),
  provider: ProviderNameSchema,
  orgNumber: z.string().optional(),
  companyName: z.string().optional(),
  systemSettingsId: z.string().optional(),
});

export const UpdateConsentBody = z.object({
  name: z.string().min(1).optional(),
  status: z.number().int().min(0).max(3).optional(),
  orgNumber: z.string().optional(),
  companyName: z.string().optional(),
  systemSettingsId: z.string().optional(),
});

export const ConsentQueryParams = z.object({
  provider: ProviderNameSchema.optional(),
  status: z.coerce.number().int().min(0).max(3).optional(),
});

// ── OTC ──

export const CreateOTCBody = z.object({
  expiresInMinutes: z.number().int().min(1).max(1440).default(60),
});

// ── Token exchange ──

export const TokenExchangeBody = z.object({
  code: z.string().min(1),
  consentId: z.string().min(1),
  provider: ProviderNameSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  scopes: z.string().optional(),
});

// ── Resource query ──

export const ResourceQueryParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  lastModified: z.string().optional(),
  fiscalYear: z.coerce.number().int().optional(),
});

// ── Create resource ──

export const CreateResourceBody = z.record(z.unknown());
