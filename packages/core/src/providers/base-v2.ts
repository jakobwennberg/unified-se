import type { AccountingProvider } from './base.js';
import type { ProviderCredentials } from '../types/provider.js';
import type { ResourceType } from '../types/dto/resource-type.js';
import type { PaginatedResponse } from '../types/dto/common.js';

export interface ResourceQueryOptions {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  lastModified?: string;
  fiscalYear?: number;
  filter?: Record<string, string>;
  /** When true, hydrate journal entries by fetching each voucher's detail (Fortnox-specific) */
  includeEntries?: boolean;
}

export interface ResourceCapabilities {
  /** Which resource types this provider supports for read */
  read: ResourceType[];
  /** Which resource types this provider supports for write/create */
  write: ResourceType[];
  /** Which resource types support sub-resources (payments, attachments) */
  subResources: Partial<Record<ResourceType, ResourceType[]>>;
}

/**
 * V2 provider interface extending the existing provider with typed resource operations.
 * Used for gateway mode (real-time typed reads/writes) while the base interface
 * continues to serve sync mode (bulk entity fetching).
 */
export interface AccountingProviderV2 extends AccountingProvider {
  /** Declare what this provider supports in V2 mode */
  getResourceCapabilities(): ResourceCapabilities;

  /** List resources with pagination and filtering */
  listResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>>;

  /** Get a single resource by ID */
  getResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<T | null>;

  /** Create a new resource */
  createResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T>;

  /** List sub-resources (e.g., payments on an invoice) */
  listSubResource<T>(
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>>;

  /** Create a sub-resource (e.g., add a payment to an invoice) */
  createSubResource<T>(
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T>;
}
