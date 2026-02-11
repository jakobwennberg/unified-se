import type {
  ProviderName,
  ProviderCapabilities,
  ProviderCredentials,
  CompanyInfo,
  FinancialYear,
} from '../types/provider.js';
import type {
  FetchEntitiesOptions,
  FetchEntitiesResult,
  CanonicalEntityRecord,
  FetchProgressCallback,
} from '../types/entity.js';
import type { FetchSIEOptions, FetchSIEResult } from '../types/sie.js';

/**
 * Core provider interface. Each provider (Fortnox, Visma, Bokio, BL)
 * implements this to normalize their API into a unified shape.
 *
 * Credentials are passed on each call — the package never stores tokens.
 */
export interface AccountingProvider {
  readonly name: ProviderName;

  /** What this provider supports */
  getCapabilities(): ProviderCapabilities;

  /** Test that credentials are valid */
  validateCredentials(credentials: ProviderCredentials): Promise<boolean>;

  /** Fetch basic company info */
  getCompanyInfo(credentials: ProviderCredentials): Promise<CompanyInfo>;

  /** Fetch available financial years */
  getFinancialYears(credentials: ProviderCredentials): Promise<FinancialYear[]>;

  /**
   * Fetch a single page of entities.
   * Use this for paginated fetching with fine-grained control.
   */
  fetchEntities(
    credentials: ProviderCredentials,
    options: FetchEntitiesOptions & { entityType: import('../types/entity.js').EntityType },
  ): Promise<FetchEntitiesResult>;

  /**
   * Fetch all entities of a given type, handling pagination internally.
   * Calls onProgress for dashboard/UI updates.
   */
  fetchAllEntities(
    credentials: ProviderCredentials,
    options: FetchEntitiesOptions & { entityType: import('../types/entity.js').EntityType },
    onProgress?: FetchProgressCallback,
  ): Promise<CanonicalEntityRecord[]>;

  /**
   * Fetch SIE files for the given financial years.
   * Returns raw + parsed data.
   */
  fetchSIE(
    credentials: ProviderCredentials,
    options: FetchSIEOptions,
  ): Promise<FetchSIEResult>;
}
