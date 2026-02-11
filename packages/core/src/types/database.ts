import type { CanonicalEntityRecord, EntityType } from './entity.js';
import type { ProviderName } from './provider.js';
import type { SyncProgress, SyncState } from './sync.js';
import type { SIEUpload, SIEFullData } from './sie.js';
import type { ConsentRecord, ConsentTokenRecord, OneTimeCode, ConsentStatus } from './consent.js';

export interface UpsertResult {
  inserted: number;
  updated: number;
  unchanged: number;
}

export interface GetEntitiesOptions {
  page?: number;
  pageSize?: number;
  fiscalYear?: number;
  fromDate?: string;
  toDate?: string;
  orderBy?: 'document_date' | 'last_modified' | 'external_id';
  orderDirection?: 'asc' | 'desc';
}

export interface ConnectionRecord {
  connectionId: string;
  provider: ProviderName;
  displayName: string;
  organizationNumber?: string | null;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Database-agnostic adapter interface.
 * Two implementations ship with the package:
 * - PostgresAdapter (via Drizzle) for production
 * - SQLiteAdapter (via Drizzle) for local dev / zero-config
 */
export interface DatabaseAdapter {
  // Entity records
  upsertEntities(
    connectionId: string,
    entityType: EntityType,
    entities: CanonicalEntityRecord[],
  ): Promise<UpsertResult>;

  getEntities(
    connectionId: string,
    entityType: EntityType,
    options?: GetEntitiesOptions,
  ): Promise<CanonicalEntityRecord[]>;

  getEntityCount(
    connectionId: string,
    entityType?: EntityType,
  ): Promise<number>;

  // Sync state (cursors)
  getSyncState(
    connectionId: string,
    entityType: EntityType,
  ): Promise<SyncState | null>;

  updateSyncState(
    connectionId: string,
    entityType: EntityType,
    update: Partial<SyncState>,
  ): Promise<void>;

  // Sync progress (job tracking)
  upsertSyncProgress(progress: SyncProgress): Promise<void>;

  getSyncProgress(jobId: string): Promise<SyncProgress | null>;

  getSyncHistory(
    connectionId: string,
    limit?: number,
  ): Promise<SyncProgress[]>;

  // SIE data
  storeSIEData(
    connectionId: string,
    data: SIEFullData,
  ): Promise<string>;

  getSIEUploads(connectionId: string): Promise<SIEUpload[]>;

  getSIEData(uploadId: string): Promise<SIEFullData | null>;

  // Connections (metadata, not auth)
  upsertConnection(connection: ConnectionRecord): Promise<void>;

  getConnections(options?: {
    provider?: ProviderName;
  }): Promise<ConnectionRecord[]>;

  getConnection(connectionId: string): Promise<ConnectionRecord | null>;

  deleteConnection(connectionId: string): Promise<void>;

  // Consent management
  upsertConsent(consent: ConsentRecord): Promise<void>;
  getConsent(consentId: string): Promise<ConsentRecord | null>;
  getConsents(tenantId: string, options?: { provider?: ProviderName; status?: ConsentStatus }): Promise<ConsentRecord[]>;
  deleteConsent(consentId: string): Promise<void>;

  // Consent token storage
  storeConsentTokens(tokens: ConsentTokenRecord): Promise<void>;
  getConsentTokens(consentId: string): Promise<ConsentTokenRecord | null>;
  deleteConsentTokens(consentId: string): Promise<void>;

  // One-time codes
  createOneTimeCode(otc: OneTimeCode): Promise<void>;
  validateOneTimeCode(code: string): Promise<OneTimeCode | null>;

  // Schema management
  migrate(): Promise<void>;
}
