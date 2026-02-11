import type { ProviderCredentials } from '../types/provider.js';
import type { AccountingProviderV2, ResourceQueryOptions } from '../providers/base-v2.js';
import type { PaginatedResponse } from '../types/dto/common.js';
import type { ResourceType } from '../types/dto/resource-type.js';
import { getProvider } from '../providers/index.js';
import type { ProviderName } from '../types/provider.js';

export class GatewayHandler {
  /**
   * List resources from a provider in real-time (gateway mode).
   */
  async listResource<T>(
    providerName: ProviderName,
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    const provider = this.getV2Provider(providerName);
    return provider.listResource<T>(credentials, resourceType, options);
  }

  /**
   * Get a single resource by ID from a provider.
   */
  async getResource<T>(
    providerName: ProviderName,
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<T | null> {
    const provider = this.getV2Provider(providerName);
    return provider.getResource<T>(credentials, resourceType, resourceId);
  }

  /**
   * Create a resource via a provider.
   */
  async createResource<T>(
    providerName: ProviderName,
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T> {
    const provider = this.getV2Provider(providerName);
    return provider.createResource<T>(credentials, resourceType, data);
  }

  /**
   * List sub-resources (e.g., payments on an invoice).
   */
  async listSubResource<T>(
    providerName: ProviderName,
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    const provider = this.getV2Provider(providerName);
    return provider.listSubResource<T>(
      credentials,
      parentResourceType,
      parentResourceId,
      subResourceType,
      options,
    );
  }

  /**
   * Create a sub-resource.
   */
  async createSubResource<T>(
    providerName: ProviderName,
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T> {
    const provider = this.getV2Provider(providerName);
    return provider.createSubResource<T>(
      credentials,
      parentResourceType,
      parentResourceId,
      subResourceType,
      data,
    );
  }

  private getV2Provider(providerName: ProviderName): AccountingProviderV2 {
    const provider = getProvider(providerName);
    if (!('getResourceCapabilities' in provider)) {
      throw new Error(`Provider "${providerName}" does not support V2 resource operations`);
    }
    return provider as AccountingProviderV2;
  }
}
