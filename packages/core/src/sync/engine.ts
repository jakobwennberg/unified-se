import type { DatabaseAdapter } from '../types/database.js';
import type { SyncJob, SyncProgress, EntitySyncResult } from '../types/sync.js';
import type { CanonicalEntityRecord, EntityType } from '../types/entity.js';
import type { Logger } from '../utils/logger.js';
import { noopLogger } from '../utils/logger.js';
import { contentHash } from '../utils/hash.js';
import { getProvider } from '../providers/index.js';

export interface SyncEngineOptions {
  logger?: Logger;
}

/**
 * Sync engine that orchestrates entity + SIE sync for any provider.
 * Generalized from arcim's Fortnox-specific sync route.
 */
export class SyncEngine {
  private readonly db: DatabaseAdapter;
  private readonly logger: Logger;

  constructor(db: DatabaseAdapter, options?: SyncEngineOptions) {
    this.db = db;
    this.logger = options?.logger ?? noopLogger;
  }

  /**
   * Execute a full sync job: iterate entity types, fetch via provider,
   * normalize to canonical records, upsert with hash-based change detection.
   */
  async executeSync(job: SyncJob): Promise<SyncProgress> {
    const jobId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const progress: SyncProgress = {
      jobId,
      connectionId: job.connectionId,
      provider: job.provider,
      status: 'running',
      progress: 0,
      entityResults: [],
      startedAt,
    };

    await this.db.upsertSyncProgress(progress);

    try {
      const provider = getProvider(job.provider);
      const capabilities = provider.getCapabilities();

      // Determine which entity types to sync
      const entityTypes = job.entityTypes ?? capabilities.supportedEntityTypes;
      const totalSteps = entityTypes.length + (job.includeSIE ? 1 : 0);
      let completedSteps = 0;

      // Entity sync with per-type error isolation
      for (const entityType of entityTypes) {
        const entityResult = await this.syncEntityType(
          job,
          entityType,
          provider,
        );
        progress.entityResults.push(entityResult);
        completedSteps++;
        progress.progress = Math.round((completedSteps / totalSteps) * 100);
        await this.db.upsertSyncProgress(progress);
      }

      // SIE sync
      if (job.includeSIE && capabilities.supportsSIE) {
        try {
          const sieResult = await provider.fetchSIE(
            job.credentials,
            job.sieOptions ?? {},
          );

          for (const file of sieResult.files) {
            await this.db.storeSIEData(job.connectionId, {
              connectionId: job.connectionId,
              fiscalYear: file.fiscalYear,
              sieType: file.sieType,
              parsed: file.parsed,
              kpis: file.kpis,
              rawContent: file.rawContent,
            });
          }

          progress.sieResult = {
            fiscalYearsProcessed: sieResult.files.length,
            accountsStored: sieResult.files.reduce(
              (sum, f) => sum + f.parsed.accounts.length,
              0,
            ),
            transactionsStored: sieResult.files.reduce(
              (sum, f) => sum + f.parsed.transactions.length,
              0,
            ),
            success: true,
            durationMs: 0,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error('SIE sync failed', { error: message });
          progress.sieResult = {
            fiscalYearsProcessed: 0,
            accountsStored: 0,
            transactionsStored: 0,
            success: false,
            error: message,
            durationMs: 0,
          };
        }
        completedSteps++;
        progress.progress = Math.round((completedSteps / totalSteps) * 100);
      }

      // Determine overall status
      const allFailed = progress.entityResults.every((r) => !r.success);
      progress.status = allFailed && progress.entityResults.length > 0 ? 'failed' : 'completed';
      progress.progress = 100;
      progress.completedAt = new Date().toISOString();
      progress.totalDurationMs =
        new Date(progress.completedAt).getTime() - new Date(startedAt).getTime();

      await this.db.upsertSyncProgress(progress);
      return progress;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Sync job failed', { jobId, error: message });
      progress.status = 'failed';
      progress.error = message;
      progress.completedAt = new Date().toISOString();
      await this.db.upsertSyncProgress(progress);
      return progress;
    }
  }

  private async syncEntityType(
    job: SyncJob,
    entityType: EntityType,
    provider: ReturnType<typeof getProvider>,
  ): Promise<EntitySyncResult> {
    const start = Date.now();
    try {
      const syncState = await this.db.getSyncState(job.connectionId, entityType);

      this.logger.info(`Syncing ${entityType}`, {
        connectionId: job.connectionId,
        cursor: syncState?.lastModifiedCursor,
      });

      const entities = await provider.fetchAllEntities(
        job.credentials,
        {
          entityType,
          lastModifiedCursor: syncState?.lastModifiedCursor ?? undefined,
        },
      );

      const result = await this.db.upsertEntities(
        job.connectionId,
        entityType,
        entities,
      );

      // Update sync cursor
      const latestModified = entities.reduce<string | null>((latest, e) => {
        if (!e.last_modified) return latest;
        if (!latest) return e.last_modified;
        return e.last_modified > latest ? e.last_modified : latest;
      }, syncState?.lastModifiedCursor ?? null);

      await this.db.updateSyncState(job.connectionId, entityType, {
        lastSyncAt: new Date().toISOString(),
        lastModifiedCursor: latestModified,
        recordsFetched: (syncState?.recordsFetched ?? 0) + entities.length,
        recordsUpdated: (syncState?.recordsUpdated ?? 0) + result.updated,
      });

      return {
        entityType,
        recordsFetched: entities.length,
        recordsInserted: result.inserted,
        recordsUpdated: result.updated,
        recordsUnchanged: result.unchanged,
        success: true,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync ${entityType}`, { error: message });

      await this.db.updateSyncState(job.connectionId, entityType, {
        lastError: message,
        lastErrorAt: new Date().toISOString(),
      });

      return {
        entityType,
        recordsFetched: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsUnchanged: 0,
        success: false,
        error: message,
        durationMs: Date.now() - start,
      };
    }
  }
}
