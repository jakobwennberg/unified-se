import type { EntityType } from './entity.js';
import type { ProviderName } from './provider.js';

export type SyncStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SyncJob {
  connectionId: string;
  provider: ProviderName;
  credentials: import('./provider.js').ProviderCredentials;
  /** Which entity types to sync. If omitted, syncs all supported types. */
  entityTypes?: EntityType[];
  /** Whether to include SIE file sync */
  includeSIE?: boolean;
  /** Options for SIE sync */
  sieOptions?: {
    sieType?: 1 | 2 | 3 | 4;
    fiscalYears?: number[];
  };
}

export interface EntitySyncResult {
  entityType: EntityType;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsUnchanged: number;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface SIESyncResult {
  fiscalYearsProcessed: number;
  accountsStored: number;
  transactionsStored: number;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface SyncProgress {
  jobId: string;
  connectionId: string;
  provider: ProviderName;
  status: SyncStatus;
  /** 0-100 */
  progress: number;
  entityResults: EntitySyncResult[];
  sieResult?: SIESyncResult;
  error?: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

export interface SyncState {
  connectionId: string;
  entityType: EntityType;
  lastSyncAt: string | null;
  lastModifiedCursor: string | null;
  recordsFetched: number;
  recordsUpdated: number;
  lastError: string | null;
  lastErrorAt: string | null;
}
