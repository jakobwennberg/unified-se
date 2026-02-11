import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, sql, desc } from 'drizzle-orm';
import type {
  DatabaseAdapter,
  UpsertResult,
  GetEntitiesOptions,
  ConnectionRecord,
  CanonicalEntityRecord,
  EntityType,
  SyncProgress,
  SyncState,
  SIEUpload,
  SIEFullData,
  ConsentRecord,
  ConsentTokenRecord,
  OneTimeCode,
  ProviderName,
} from '@arcim-sync/core';
import { ConsentStatus } from '@arcim-sync/core';
import * as schema from './schema-postgres.js';

export class PostgresAdapter implements DatabaseAdapter {
  readonly db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema });
  }

  async migrate(): Promise<void> {
    // Migrations handled by Supabase migrations, not programmatically
  }

  // ============================================
  // Entity Records — not used in hosted gateway mode
  // ============================================
  async upsertEntities(): Promise<UpsertResult> {
    return { inserted: 0, updated: 0, unchanged: 0 };
  }

  async getEntities(): Promise<CanonicalEntityRecord[]> {
    return [];
  }

  async getEntityCount(): Promise<number> {
    return 0;
  }

  // ============================================
  // Sync State — not used in hosted gateway mode
  // ============================================
  async getSyncState(): Promise<SyncState | null> {
    return null;
  }

  async updateSyncState(): Promise<void> {}

  // ============================================
  // Sync Progress — not used in hosted gateway mode
  // ============================================
  async upsertSyncProgress(): Promise<void> {}

  async getSyncProgress(): Promise<SyncProgress | null> {
    return null;
  }

  async getSyncHistory(): Promise<SyncProgress[]> {
    return [];
  }

  // ============================================
  // SIE Data — not used in hosted gateway mode
  // ============================================
  async storeSIEData(): Promise<string> {
    return '';
  }

  async getSIEUploads(): Promise<SIEUpload[]> {
    return [];
  }

  async getSIEData(): Promise<SIEFullData | null> {
    return null;
  }

  // ============================================
  // Connections
  // ============================================
  async upsertConnection(connection: ConnectionRecord): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.connectionId, connection.connectionId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(schema.connections)
        .set({
          provider: connection.provider,
          displayName: connection.displayName,
          organizationNumber: connection.organizationNumber ?? null,
          lastSyncAt: connection.lastSyncAt ?? null,
          updatedAt: connection.updatedAt,
          metadata: connection.metadata ? JSON.stringify(connection.metadata) : null,
        })
        .where(eq(schema.connections.connectionId, connection.connectionId));
    } else {
      await this.db.insert(schema.connections).values({
        connectionId: connection.connectionId,
        tenantId: (connection as any).tenantId ?? 'default',
        provider: connection.provider,
        displayName: connection.displayName,
        organizationNumber: connection.organizationNumber ?? null,
        lastSyncAt: connection.lastSyncAt ?? null,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        metadata: connection.metadata ? JSON.stringify(connection.metadata) : null,
      });
    }
  }

  async getConnections(options?: { provider?: ProviderName }): Promise<ConnectionRecord[]> {
    const conditions = [];
    if (options?.provider) {
      conditions.push(eq(schema.connections.provider, options.provider));
    }

    const rows = conditions.length > 0
      ? await this.db.select().from(schema.connections).where(and(...conditions))
      : await this.db.select().from(schema.connections);

    return rows.map((row) => ({
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      displayName: row.displayName,
      organizationNumber: row.organizationNumber,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async getConnection(connectionId: string): Promise<ConnectionRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.connectionId, connectionId))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      connectionId: row.connectionId,
      provider: row.provider as ProviderName,
      displayName: row.displayName,
      organizationNumber: row.organizationNumber,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.db.delete(schema.connections).where(eq(schema.connections.connectionId, connectionId));
  }

  // ============================================
  // Consents
  // ============================================
  async upsertConsent(consent: ConsentRecord): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.id, consent.id))
      .limit(1);

    if (existing.length > 0) {
      await this.db
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
        .where(eq(schema.consents.id, consent.id));
    } else {
      await this.db.insert(schema.consents).values({
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
      });
    }
  }

  async getConsent(consentId: string): Promise<ConsentRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.id, consentId))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      status: row.status as ConsentStatus,
      provider: row.provider as ProviderName,
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
    options?: { provider?: ProviderName; status?: ConsentStatus },
  ): Promise<ConsentRecord[]> {
    const conditions = [eq(schema.consents.tenantId, tenantId)];
    if (options?.provider) {
      conditions.push(eq(schema.consents.provider, options.provider));
    }
    if (options?.status !== undefined) {
      conditions.push(eq(schema.consents.status, options.status));
    }

    const rows = await this.db
      .select()
      .from(schema.consents)
      .where(and(...conditions));

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      status: row.status as ConsentStatus,
      provider: row.provider as ProviderName,
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
    await this.db.delete(schema.consentTokens).where(eq(schema.consentTokens.consentId, consentId));
    await this.db.delete(schema.oneTimeCodes).where(eq(schema.oneTimeCodes.consentId, consentId));
    await this.db.delete(schema.consents).where(eq(schema.consents.id, consentId));
  }

  // ============================================
  // Consent Tokens
  // ============================================
  async storeConsentTokens(tokens: ConsentTokenRecord): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, tokens.consentId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(schema.consentTokens)
        .set({
          provider: tokens.provider,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          tokenExpiresAt: tokens.tokenExpiresAt ?? null,
          scopes: tokens.scopes ?? null,
          encryptedAt: tokens.encryptedAt ?? null,
        })
        .where(eq(schema.consentTokens.consentId, tokens.consentId));
    } else {
      await this.db.insert(schema.consentTokens).values({
        consentId: tokens.consentId,
        provider: tokens.provider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.tokenExpiresAt ?? null,
        scopes: tokens.scopes ?? null,
        encryptedAt: tokens.encryptedAt ?? null,
      });
    }
  }

  async getConsentTokens(consentId: string): Promise<ConsentTokenRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.consentTokens)
      .where(eq(schema.consentTokens.consentId, consentId))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    return {
      consentId: row.consentId,
      provider: row.provider as ProviderName,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken ?? undefined,
      tokenExpiresAt: row.tokenExpiresAt ?? undefined,
      scopes: row.scopes ?? undefined,
      encryptedAt: row.encryptedAt ?? undefined,
    };
  }

  async deleteConsentTokens(consentId: string): Promise<void> {
    await this.db.delete(schema.consentTokens).where(eq(schema.consentTokens.consentId, consentId));
  }

  // ============================================
  // One-Time Codes
  // ============================================
  async createOneTimeCode(otc: OneTimeCode): Promise<void> {
    await this.db.insert(schema.oneTimeCodes).values({
      code: otc.code,
      consentId: otc.consentId,
      expiresAt: otc.expiresAt,
      usedAt: otc.usedAt ?? null,
    });
  }

  async validateOneTimeCode(code: string): Promise<OneTimeCode | null> {
    const rows = await this.db
      .select()
      .from(schema.oneTimeCodes)
      .where(eq(schema.oneTimeCodes.code, code))
      .limit(1);

    if (rows.length === 0) return null;
    const row = rows[0]!;

    if (row.usedAt) return null;
    if (new Date(row.expiresAt) < new Date()) return null;

    const now = new Date().toISOString();
    await this.db
      .update(schema.oneTimeCodes)
      .set({ usedAt: now })
      .where(eq(schema.oneTimeCodes.code, code));

    return {
      code: row.code,
      consentId: row.consentId,
      expiresAt: row.expiresAt,
      usedAt: now,
    };
  }
}
