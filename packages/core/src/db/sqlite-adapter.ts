import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and, sql, desc, asc, gte, lte } from 'drizzle-orm';
import type {
  DatabaseAdapter,
  UpsertResult,
  GetEntitiesOptions,
  ConnectionRecord,
} from '../types/database.js';
import type { CanonicalEntityRecord, EntityType } from '../types/entity.js';
import type { SyncProgress, SyncState } from '../types/sync.js';
import type { SIEUpload, SIEFullData } from '../types/sie.js';
import type { ProviderName } from '../types/provider.js';
import type { ConsentRecord, ConsentTokenRecord, OneTimeCode, ConsentStatus } from '../types/consent.js';
import * as schema from './schema.js';

export class SQLiteAdapter implements DatabaseAdapter {
  private readonly db: BetterSQLite3Database<typeof schema>;
  private readonly sqlite: Database.Database | null;

  constructor(pathOrDb: string | BetterSQLite3Database<typeof schema>) {
    if (typeof pathOrDb === 'string') {
      const sqlite = new Database(pathOrDb);
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('foreign_keys = ON');
      this.sqlite = sqlite;
      this.db = drizzle(sqlite, { schema });
    } else {
      this.sqlite = null;
      this.db = pathOrDb;
    }
  }

  async migrate(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS connections (
        connection_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        display_name TEXT NOT NULL,
        organization_number TEXT,
        last_sync_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS entity_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        external_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        fiscal_year INTEGER,
        document_date TEXT,
        due_date TEXT,
        counterparty_number TEXT,
        counterparty_name TEXT,
        amount REAL,
        currency TEXT NOT NULL DEFAULT 'SEK',
        status TEXT,
        raw_data TEXT NOT NULL,
        last_modified TEXT,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS entity_records_unique ON entity_records (connection_id, entity_type, external_id)`,
      `CREATE INDEX IF NOT EXISTS entity_records_connection ON entity_records (connection_id)`,
      `CREATE INDEX IF NOT EXISTS entity_records_connection_type ON entity_records (connection_id, entity_type)`,
      `CREATE INDEX IF NOT EXISTS entity_records_document_date ON entity_records (document_date)`,
      `CREATE INDEX IF NOT EXISTS entity_records_connection_type_fy ON entity_records (connection_id, entity_type, fiscal_year)`,
      `CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        last_sync_at TEXT,
        last_modified_cursor TEXT,
        records_fetched INTEGER NOT NULL DEFAULT 0,
        records_updated INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        last_error_at TEXT
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS sync_state_unique ON sync_state (connection_id, entity_type)`,
      `CREATE TABLE IF NOT EXISTS sync_progress (
        job_id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        entity_results TEXT NOT NULL,
        sie_result TEXT,
        error TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        total_duration_ms INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS sie_uploads (
        upload_id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        sie_type INTEGER NOT NULL,
        file_name TEXT,
        account_count INTEGER NOT NULL DEFAULT 0,
        transaction_count INTEGER NOT NULL DEFAULT 0,
        uploaded_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS sie_uploads_unique ON sie_uploads (connection_id, fiscal_year, sie_type)`,
      `CREATE TABLE IF NOT EXISTS sie_data (
        upload_id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        sie_type INTEGER NOT NULL,
        parsed TEXT NOT NULL,
        kpis TEXT NOT NULL,
        raw_content TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS consents (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status INTEGER NOT NULL DEFAULT 0,
        provider TEXT NOT NULL,
        org_number TEXT,
        company_name TEXT,
        system_settings_id TEXT,
        etag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS consents_tenant ON consents (tenant_id)`,
      `CREATE INDEX IF NOT EXISTS consents_tenant_provider ON consents (tenant_id, provider)`,
      `CREATE TABLE IF NOT EXISTS consent_tokens (
        consent_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TEXT,
        scopes TEXT,
        encrypted_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS one_time_codes (
        code TEXT PRIMARY KEY,
        consent_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS otc_consent ON one_time_codes (consent_id)`,
    ];

    for (const stmt of statements) {
      this.db.run(sql.raw(stmt));
    }
  }

  // ============================================
  // Entity Records
  // ============================================

  async upsertEntities(
    connectionId: string,
    entityType: EntityType,
    entities: CanonicalEntityRecord[],
  ): Promise<UpsertResult> {
    if (entities.length === 0) {
      return { inserted: 0, updated: 0, unchanged: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    const now = new Date().toISOString();

    // Use a transaction for batch upsert
    const upsertFn = () => {
      for (const entity of entities) {
        // Check existing record's hash
        const existing = this.db
          .select({ contentHash: schema.entityRecords.contentHash })
          .from(schema.entityRecords)
          .where(
            and(
              eq(schema.entityRecords.connectionId, connectionId),
              eq(schema.entityRecords.entityType, entityType),
              eq(schema.entityRecords.externalId, entity.external_id),
            ),
          )
          .get();

        if (existing) {
          if (existing.contentHash === entity.content_hash) {
            unchanged++;
          } else {
            this.db
              .update(schema.entityRecords)
              .set({
                provider: entity.provider,
                fiscalYear: entity.fiscal_year,
                documentDate: entity.document_date,
                dueDate: entity.due_date,
                counterpartyNumber: entity.counterparty_number,
                counterpartyName: entity.counterparty_name,
                amount: entity.amount,
                currency: entity.currency,
                status: entity.status,
                rawData: entity.raw_data,
                lastModified: entity.last_modified,
                contentHash: entity.content_hash,
                updatedAt: now,
              })
              .where(
                and(
                  eq(schema.entityRecords.connectionId, connectionId),
                  eq(schema.entityRecords.entityType, entityType),
                  eq(schema.entityRecords.externalId, entity.external_id),
                ),
              )
              .run();
            updated++;
          }
        } else {
          this.db
            .insert(schema.entityRecords)
            .values({
              connectionId,
              entityType,
              externalId: entity.external_id,
              provider: entity.provider,
              fiscalYear: entity.fiscal_year,
              documentDate: entity.document_date,
              dueDate: entity.due_date,
              counterpartyNumber: entity.counterparty_number,
              counterpartyName: entity.counterparty_name,
              amount: entity.amount,
              currency: entity.currency,
              status: entity.status,
              rawData: entity.raw_data,
              lastModified: entity.last_modified,
              contentHash: entity.content_hash,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          inserted++;
        }
      }
    };

    // Execute in transaction if we have access to sqlite instance
    if (this.sqlite) {
      this.sqlite.transaction(upsertFn)();
    } else {
      upsertFn();
    }

    return { inserted, updated, unchanged };
  }

  async getEntities(
    connectionId: string,
    entityType: EntityType,
    options?: GetEntitiesOptions,
  ): Promise<CanonicalEntityRecord[]> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 100;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(schema.entityRecords.connectionId, connectionId),
      eq(schema.entityRecords.entityType, entityType),
    ];

    if (options?.fiscalYear != null) {
      conditions.push(eq(schema.entityRecords.fiscalYear, options.fiscalYear));
    }
    if (options?.fromDate) {
      conditions.push(gte(schema.entityRecords.documentDate, options.fromDate));
    }
    if (options?.toDate) {
      conditions.push(lte(schema.entityRecords.documentDate, options.toDate));
    }

    let orderByClause;
    const dir = options?.orderDirection === 'desc' ? desc : asc;
    switch (options?.orderBy) {
      case 'document_date':
        orderByClause = dir(schema.entityRecords.documentDate);
        break;
      case 'last_modified':
        orderByClause = dir(schema.entityRecords.lastModified);
        break;
      case 'external_id':
        orderByClause = dir(schema.entityRecords.externalId);
        break;
      default:
        orderByClause = asc(schema.entityRecords.id);
    }

    const rows = this.db
      .select()
      .from(schema.entityRecords)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset)
      .all();

    return rows.map((row) => this.rowToCanonicalEntity(row));
  }

  async getEntityCount(
    connectionId: string,
    entityType?: EntityType,
  ): Promise<number> {
    const conditions = [eq(schema.entityRecords.connectionId, connectionId)];
    if (entityType) {
      conditions.push(eq(schema.entityRecords.entityType, entityType));
    }

    const result = this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.entityRecords)
      .where(and(...conditions))
      .get();

    return result?.count ?? 0;
  }

  // ============================================
  // Sync State
  // ============================================

  async getSyncState(
    connectionId: string,
    entityType: EntityType,
  ): Promise<SyncState | null> {
    const row = this.db
      .select()
      .from(schema.syncState)
      .where(
        and(
          eq(schema.syncState.connectionId, connectionId),
          eq(schema.syncState.entityType, entityType),
        ),
      )
      .get();

    if (!row) return null;

    return {
      connectionId: row.connectionId,
      entityType: row.entityType as EntityType,
      lastSyncAt: row.lastSyncAt,
      lastModifiedCursor: row.lastModifiedCursor,
      recordsFetched: row.recordsFetched,
      recordsUpdated: row.recordsUpdated,
      lastError: row.lastError,
      lastErrorAt: row.lastErrorAt,
    };
  }

  async updateSyncState(
    connectionId: string,
    entityType: EntityType,
    update: Partial<SyncState>,
  ): Promise<void> {
    const existing = await this.getSyncState(connectionId, entityType);

    if (existing) {
      const merged = { ...existing, ...update };
      this.db
        .update(schema.syncState)
        .set({
          lastSyncAt: merged.lastSyncAt,
          lastModifiedCursor: merged.lastModifiedCursor,
          recordsFetched: merged.recordsFetched,
          recordsUpdated: merged.recordsUpdated,
          lastError: merged.lastError,
          lastErrorAt: merged.lastErrorAt,
        })
        .where(
          and(
            eq(schema.syncState.connectionId, connectionId),
            eq(schema.syncState.entityType, entityType),
          ),
        )
        .run();
    } else {
      this.db
        .insert(schema.syncState)
        .values({
          connectionId,
          entityType,
          lastSyncAt: update.lastSyncAt ?? null,
          lastModifiedCursor: update.lastModifiedCursor ?? null,
          recordsFetched: update.recordsFetched ?? 0,
          recordsUpdated: update.recordsUpdated ?? 0,
          lastError: update.lastError ?? null,
          lastErrorAt: update.lastErrorAt ?? null,
        })
        .run();
    }
  }

  // ============================================
  // Sync Progress
  // ============================================

  async upsertSyncProgress(progress: SyncProgress): Promise<void> {
    const existing = this.db
      .select()
      .from(schema.syncProgress)
      .where(eq(schema.syncProgress.jobId, progress.jobId))
      .get();

    if (existing) {
      this.db
        .update(schema.syncProgress)
        .set({
          status: progress.status,
          progress: progress.progress,
          entityResults: progress.entityResults as unknown[],
          sieResult: progress.sieResult as Record<string, unknown> | undefined,
          error: progress.error ?? null,
          completedAt: progress.completedAt ?? null,
          totalDurationMs: progress.totalDurationMs ?? null,
        })
        .where(eq(schema.syncProgress.jobId, progress.jobId))
        .run();
    } else {
      this.db
        .insert(schema.syncProgress)
        .values({
          jobId: progress.jobId,
          connectionId: progress.connectionId,
          provider: progress.provider,
          status: progress.status,
          progress: progress.progress,
          entityResults: progress.entityResults as unknown[],
          sieResult: progress.sieResult as Record<string, unknown> | undefined,
          error: progress.error ?? null,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt ?? null,
          totalDurationMs: progress.totalDurationMs ?? null,
        })
        .run();
    }
  }

  async getSyncProgress(jobId: string): Promise<SyncProgress | null> {
    const row = this.db
      .select()
      .from(schema.syncProgress)
      .where(eq(schema.syncProgress.jobId, jobId))
      .get();

    if (!row) return null;

    return {
      jobId: row.jobId,
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      status: row.status as SyncProgress['status'],
      progress: row.progress,
      entityResults: row.entityResults as SyncProgress['entityResults'],
      sieResult: (row.sieResult as unknown) as SyncProgress['sieResult'],
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      totalDurationMs: row.totalDurationMs ?? undefined,
    };
  }

  async getSyncHistory(
    connectionId: string,
    limit?: number,
  ): Promise<SyncProgress[]> {
    const rows = this.db
      .select()
      .from(schema.syncProgress)
      .where(eq(schema.syncProgress.connectionId, connectionId))
      .orderBy(desc(schema.syncProgress.startedAt))
      .limit(limit ?? 50)
      .all();

    return rows.map((row) => ({
      jobId: row.jobId,
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      status: row.status as SyncProgress['status'],
      progress: row.progress,
      entityResults: row.entityResults as SyncProgress['entityResults'],
      sieResult: (row.sieResult as unknown) as SyncProgress['sieResult'],
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      totalDurationMs: row.totalDurationMs ?? undefined,
    }));
  }

  // ============================================
  // SIE Data
  // ============================================

  async storeSIEData(
    connectionId: string,
    data: SIEFullData,
  ): Promise<string> {
    const uploadId = data.uploadId ?? crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if exists for this (connectionId, fiscalYear, sieType)
    const existing = this.db
      .select()
      .from(schema.sieUploads)
      .where(
        and(
          eq(schema.sieUploads.connectionId, connectionId),
          eq(schema.sieUploads.fiscalYear, data.fiscalYear),
          eq(schema.sieUploads.sieType, data.sieType),
        ),
      )
      .get();

    if (existing) {
      // Update existing upload
      this.db
        .update(schema.sieUploads)
        .set({
          accountCount: data.parsed.accounts.length,
          transactionCount: data.parsed.transactions.length,
          uploadedAt: now,
        })
        .where(eq(schema.sieUploads.uploadId, existing.uploadId))
        .run();

      this.db
        .update(schema.sieData)
        .set({
          parsed: data.parsed as unknown as Record<string, unknown>,
          kpis: data.kpis as unknown as Record<string, unknown>,
          rawContent: data.rawContent ?? null,
        })
        .where(eq(schema.sieData.uploadId, existing.uploadId))
        .run();

      return existing.uploadId;
    }

    // Insert new upload
    this.db
      .insert(schema.sieUploads)
      .values({
        uploadId,
        connectionId,
        fiscalYear: data.fiscalYear,
        sieType: data.sieType,
        accountCount: data.parsed.accounts.length,
        transactionCount: data.parsed.transactions.length,
        uploadedAt: now,
      })
      .run();

    this.db
      .insert(schema.sieData)
      .values({
        uploadId,
        connectionId,
        fiscalYear: data.fiscalYear,
        sieType: data.sieType,
        parsed: data.parsed as unknown as Record<string, unknown>,
        kpis: data.kpis as unknown as Record<string, unknown>,
        rawContent: data.rawContent ?? null,
      })
      .run();

    return uploadId;
  }

  async getSIEUploads(connectionId: string): Promise<SIEUpload[]> {
    const rows = this.db
      .select()
      .from(schema.sieUploads)
      .where(eq(schema.sieUploads.connectionId, connectionId))
      .all();

    return rows.map((row) => ({
      uploadId: row.uploadId,
      connectionId: row.connectionId,
      fiscalYear: row.fiscalYear,
      sieType: row.sieType as SIEUpload['sieType'],
      fileName: row.fileName ?? undefined,
      accountCount: row.accountCount,
      transactionCount: row.transactionCount,
      uploadedAt: row.uploadedAt,
    }));
  }

  async getSIEData(uploadId: string): Promise<SIEFullData | null> {
    const upload = this.db
      .select()
      .from(schema.sieUploads)
      .where(eq(schema.sieUploads.uploadId, uploadId))
      .get();

    if (!upload) return null;

    const data = this.db
      .select()
      .from(schema.sieData)
      .where(eq(schema.sieData.uploadId, uploadId))
      .get();

    if (!data) return null;

    return {
      uploadId: upload.uploadId,
      connectionId: upload.connectionId,
      fiscalYear: upload.fiscalYear,
      sieType: upload.sieType as SIEFullData['sieType'],
      parsed: data.parsed as unknown as SIEFullData['parsed'],
      kpis: data.kpis as unknown as SIEFullData['kpis'],
      rawContent: data.rawContent ?? undefined,
    };
  }

  // ============================================
  // Connections
  // ============================================

  async upsertConnection(connection: ConnectionRecord): Promise<void> {
    const existing = this.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.connectionId, connection.connectionId))
      .get();

    if (existing) {
      this.db
        .update(schema.connections)
        .set({
          provider: connection.provider,
          displayName: connection.displayName,
          organizationNumber: connection.organizationNumber ?? null,
          lastSyncAt: connection.lastSyncAt ?? null,
          updatedAt: connection.updatedAt,
          metadata: connection.metadata ?? null,
        })
        .where(eq(schema.connections.connectionId, connection.connectionId))
        .run();
    } else {
      this.db
        .insert(schema.connections)
        .values({
          connectionId: connection.connectionId,
          provider: connection.provider,
          displayName: connection.displayName,
          organizationNumber: connection.organizationNumber ?? null,
          lastSyncAt: connection.lastSyncAt ?? null,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          metadata: connection.metadata ?? null,
        })
        .run();
    }
  }

  async getConnections(options?: {
    provider?: ProviderName;
  }): Promise<ConnectionRecord[]> {
    const conditions = [];
    if (options?.provider) {
      conditions.push(eq(schema.connections.provider, options.provider));
    }

    const rows =
      conditions.length > 0
        ? this.db
            .select()
            .from(schema.connections)
            .where(and(...conditions))
            .all()
        : this.db.select().from(schema.connections).all();

    return rows.map((row) => ({
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      displayName: row.displayName,
      organizationNumber: row.organizationNumber,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ?? undefined,
    }));
  }

  async getConnection(connectionId: string): Promise<ConnectionRecord | null> {
    const row = this.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.connectionId, connectionId))
      .get();

    if (!row) return null;

    return {
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      displayName: row.displayName,
      organizationNumber: row.organizationNumber,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ?? undefined,
    };
  }

  async deleteConnection(connectionId: string): Promise<void> {
    // Cascade delete all related records
    this.db
      .delete(schema.entityRecords)
      .where(eq(schema.entityRecords.connectionId, connectionId))
      .run();

    this.db
      .delete(schema.syncState)
      .where(eq(schema.syncState.connectionId, connectionId))
      .run();

    this.db
      .delete(schema.syncProgress)
      .where(eq(schema.syncProgress.connectionId, connectionId))
      .run();

    // Delete SIE data first (references sie_uploads)
    const uploads = this.db
      .select({ uploadId: schema.sieUploads.uploadId })
      .from(schema.sieUploads)
      .where(eq(schema.sieUploads.connectionId, connectionId))
      .all();

    for (const upload of uploads) {
      this.db
        .delete(schema.sieData)
        .where(eq(schema.sieData.uploadId, upload.uploadId))
        .run();
    }

    this.db
      .delete(schema.sieUploads)
      .where(eq(schema.sieUploads.connectionId, connectionId))
      .run();

    this.db
      .delete(schema.connections)
      .where(eq(schema.connections.connectionId, connectionId))
      .run();
  }

  // ============================================
  // Consents
  // ============================================

  async upsertConsent(consent: ConsentRecord): Promise<void> {
    const existing = this.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.id, consent.id))
      .get();

    if (existing) {
      this.db
        .update(schema.consents)
        .set({
          name: consent.name,
          status: consent.status,
          provider: consent.provider,
          orgNumber: consent.orgNumber ?? null,
          companyName: consent.companyName ?? null,
          systemSettingsId: consent.systemSettingsId ?? null,
          etag: consent.etag,
          updatedAt: consent.updatedAt,
          expiresAt: consent.expiresAt ?? null,
        })
        .where(eq(schema.consents.id, consent.id))
        .run();
    } else {
      this.db
        .insert(schema.consents)
        .values({
          id: consent.id,
          tenantId: consent.tenantId,
          name: consent.name,
          status: consent.status,
          provider: consent.provider,
          orgNumber: consent.orgNumber ?? null,
          companyName: consent.companyName ?? null,
          systemSettingsId: consent.systemSettingsId ?? null,
          etag: consent.etag,
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt,
          expiresAt: consent.expiresAt ?? null,
        })
        .run();
    }
  }

  async getConsent(consentId: string): Promise<ConsentRecord | null> {
    const row = this.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.id, consentId))
      .get();

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      status: row.status as ConsentStatus,
      provider: row.provider as import('../types/provider.js').ProviderName,
      orgNumber: row.orgNumber ?? undefined,
      companyName: row.companyName ?? undefined,
      systemSettingsId: row.systemSettingsId ?? undefined,
      etag: row.etag,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt ?? undefined,
    };
  }

  async getConsents(
    tenantId: string,
    options?: { provider?: import('../types/provider.js').ProviderName; status?: ConsentStatus },
  ): Promise<ConsentRecord[]> {
    const conditions = [eq(schema.consents.tenantId, tenantId)];
    if (options?.provider) {
      conditions.push(eq(schema.consents.provider, options.provider));
    }
    if (options?.status !== undefined) {
      conditions.push(eq(schema.consents.status, options.status));
    }

    const rows = this.db
      .select()
      .from(schema.consents)
      .where(and(...conditions))
      .all();

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      status: row.status as ConsentStatus,
      provider: row.provider as import('../types/provider.js').ProviderName,
      orgNumber: row.orgNumber ?? undefined,
      companyName: row.companyName ?? undefined,
      systemSettingsId: row.systemSettingsId ?? undefined,
      etag: row.etag,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt ?? undefined,
    }));
  }

  async deleteConsent(consentId: string): Promise<void> {
    // Delete tokens and OTCs first
    this.db
      .delete(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, consentId))
      .run();
    this.db
      .delete(schema.oneTimeCodes)
      .where(eq(schema.oneTimeCodes.consentId, consentId))
      .run();
    this.db
      .delete(schema.consents)
      .where(eq(schema.consents.id, consentId))
      .run();
  }

  // ============================================
  // Consent Tokens
  // ============================================

  async storeConsentTokens(tokens: ConsentTokenRecord): Promise<void> {
    const existing = this.db
      .select()
      .from(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, tokens.consentId))
      .get();

    if (existing) {
      this.db
        .update(schema.consentTokens)
        .set({
          provider: tokens.provider,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          tokenExpiresAt: tokens.tokenExpiresAt ?? null,
          scopes: tokens.scopes ?? null,
          encryptedAt: tokens.encryptedAt ?? null,
        })
        .where(eq(schema.consentTokens.consentId, tokens.consentId))
        .run();
    } else {
      this.db
        .insert(schema.consentTokens)
        .values({
          consentId: tokens.consentId,
          provider: tokens.provider,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          tokenExpiresAt: tokens.tokenExpiresAt ?? null,
          scopes: tokens.scopes ?? null,
          encryptedAt: tokens.encryptedAt ?? null,
        })
        .run();
    }
  }

  async getConsentTokens(consentId: string): Promise<ConsentTokenRecord | null> {
    const row = this.db
      .select()
      .from(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, consentId))
      .get();

    if (!row) return null;

    return {
      consentId: row.consentId,
      provider: row.provider as import('../types/provider.js').ProviderName,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken ?? undefined,
      tokenExpiresAt: row.tokenExpiresAt ?? undefined,
      scopes: row.scopes ?? undefined,
      encryptedAt: row.encryptedAt ?? undefined,
    };
  }

  async deleteConsentTokens(consentId: string): Promise<void> {
    this.db
      .delete(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, consentId))
      .run();
  }

  // ============================================
  // One-Time Codes
  // ============================================

  async createOneTimeCode(otc: OneTimeCode): Promise<void> {
    this.db
      .insert(schema.oneTimeCodes)
      .values({
        code: otc.code,
        consentId: otc.consentId,
        expiresAt: otc.expiresAt,
        usedAt: otc.usedAt ?? null,
      })
      .run();
  }

  async validateOneTimeCode(code: string): Promise<OneTimeCode | null> {
    const row = this.db
      .select()
      .from(schema.oneTimeCodes)
      .where(eq(schema.oneTimeCodes.code, code))
      .get();

    if (!row) return null;

    // Check if already used
    if (row.usedAt) return null;

    // Check if expired
    if (new Date(row.expiresAt) < new Date()) return null;

    // Mark as used
    const now = new Date().toISOString();
    this.db
      .update(schema.oneTimeCodes)
      .set({ usedAt: now })
      .where(eq(schema.oneTimeCodes.code, code))
      .run();

    return {
      code: row.code,
      consentId: row.consentId,
      expiresAt: row.expiresAt,
      usedAt: now,
    };
  }

  private rowToCanonicalEntity(row: typeof schema.entityRecords.$inferSelect): CanonicalEntityRecord {
    return {
      external_id: row.externalId,
      entity_type: row.entityType as EntityType,
      provider: row.provider as ProviderName,
      fiscal_year: row.fiscalYear,
      document_date: row.documentDate,
      due_date: row.dueDate,
      counterparty_number: row.counterpartyNumber,
      counterparty_name: row.counterpartyName,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      raw_data: row.rawData,
      last_modified: row.lastModified,
      content_hash: row.contentHash,
    };
  }
}
