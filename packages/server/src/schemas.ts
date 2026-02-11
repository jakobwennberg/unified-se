import { z } from 'zod';
import { ProviderNameSchema, EntityTypeSchema } from '@arcim-sync/core';

// ── Connections ──

export const CreateConnectionBody = z.object({
  connectionId: z.string().min(1),
  provider: ProviderNameSchema,
  displayName: z.string().min(1),
  organizationNumber: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ConnectionQueryParams = z.object({
  provider: ProviderNameSchema.optional(),
});

// ── Sync ──

export const TriggerSyncBody = z.object({
  connectionId: z.string().min(1),
  provider: ProviderNameSchema,
  credentials: z.object({
    accessToken: z.string().min(1),
  }).passthrough(),
  entityTypes: z.array(EntityTypeSchema).optional(),
  includeSIE: z.boolean().optional(),
  sieOptions: z
    .object({
      sieType: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      fiscalYears: z.array(z.number()).optional(),
    })
    .optional(),
});

export const SyncHistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Entities ──

export const EntityQueryParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(50),
  fiscalYear: z.coerce.number().int().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  orderBy: z.enum(['document_date', 'last_modified', 'external_id']).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
});

export const EntityCountQuery = z.object({
  entityType: EntityTypeSchema.optional(),
});

// ── SIE ──
// No request schemas needed — SIE routes only use path params.

// ── OAuth (Fortnox) ──

export const FortnoxUrlQuery = z.object({
  redirectUri: z.string().optional(),
  scopes: z.string().optional(),
  state: z.string().optional(),
});

export const FortnoxExchangeBody = z.object({
  code: z.string().min(1),
});

export const FortnoxRefreshBody = z.object({
  refreshToken: z.string().min(1),
});

export const FortnoxRevokeBody = z.object({
  refreshToken: z.string().min(1),
});

// ── OAuth (Visma) ──

export const VismaUrlQuery = z.object({
  redirectUri: z.string().optional(),
  scopes: z.string().optional(),
  state: z.string().optional(),
  acrValues: z.string().optional(),
});

export const VismaExchangeBody = z.object({
  code: z.string().min(1),
});

export const VismaRefreshBody = z.object({
  refreshToken: z.string().min(1),
});

export const VismaRevokeBody = z.object({
  refreshToken: z.string().min(1),
});
