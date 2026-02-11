import type { AccountingProviderV2, ResourceCapabilities, ResourceQueryOptions } from '../base-v2.js';
import type { ProviderCapabilities, ProviderCredentials, CompanyInfo, FinancialYear } from '../../types/provider.js';
import type { FetchEntitiesOptions, FetchEntitiesResult, CanonicalEntityRecord, EntityType, FetchProgressCallback } from '../../types/entity.js';
import type { FetchSIEOptions, FetchSIEResult, SIEType } from '../../types/sie.js';
import type { PaginatedResponse } from '../../types/dto/common.js';
import type { FortnoxCompanyInformation, FortnoxFinancialYear } from './types.js';
import { ResourceType } from '../../types/dto/resource-type.js';
import { FortnoxClient } from './client.js';
import { getFortnoxConfig, FORTNOX_ENTITY_CONFIGS, FORTNOX_RATE_LIMIT } from './config.js';
import { mapFortnoxEntity } from './mapper.js';
import { FORTNOX_RESOURCE_CONFIGS } from './resource-config.js';
import { mapFortnoxToPayment } from './typed-mapper.js';
import { registerProvider } from '../index.js';
import { decodeSIEBuffer } from '../../sie/encoding.js';
import { parseSIE } from '../../sie/parser.js';
import { calculateKPIs } from '../../sie/kpi.js';

export class FortnoxProvider implements AccountingProviderV2 {
  readonly name = 'fortnox' as const;
  private readonly client: FortnoxClient;

  constructor(client?: FortnoxClient) {
    this.client = client ?? new FortnoxClient();
  }

  getCapabilities(): ProviderCapabilities {
    return {
      name: 'fortnox',
      displayName: 'Fortnox',
      supportedEntityTypes: Object.keys(FORTNOX_ENTITY_CONFIGS) as EntityType[],
      supportsSIE: true,
      sieTypes: [1, 2, 3, 4],
      supportsIncrementalSync: true,
      incrementalSyncEntities: Object.entries(FORTNOX_ENTITY_CONFIGS)
        .filter(([_, cfg]) => cfg.incremental)
        .map(([key]) => key as EntityType),
      authType: 'oauth2',
      rateLimits: FORTNOX_RATE_LIMIT,
    };
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<boolean> {
    try {
      await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        '/companyinformation',
      );
      return true;
    } catch {
      return false;
    }
  }

  async getCompanyInfo(credentials: ProviderCredentials): Promise<CompanyInfo> {
    const response = await this.client.get<{
      CompanyInformation: FortnoxCompanyInformation;
    }>(credentials.accessToken, '/companyinformation');

    const info = response.CompanyInformation;
    return {
      companyName: info.CompanyName ?? '',
      organizationNumber: info.OrganizationNumber ?? null,
      address: info.Address ?? null,
      city: info.City ?? null,
      country: info.Country ?? null,
      email: info.Email ?? null,
      phone: info.Phone1 ?? null,
      raw: info as unknown as Record<string, unknown>,
    };
  }

  async getFinancialYears(credentials: ProviderCredentials): Promise<FinancialYear[]> {
    const response = await this.client.get<{
      FinancialYears: FortnoxFinancialYear[];
    }>(credentials.accessToken, '/financialyears');

    return (response.FinancialYears ?? []).map((fy) => {
      const year = parseInt(fy.ToDate.slice(0, 4), 10);
      return {
        id: fy.Id,
        fromDate: fy.FromDate,
        toDate: fy.ToDate,
        year,
      };
    });
  }

  async fetchEntities(
    credentials: ProviderCredentials,
    options: FetchEntitiesOptions & { entityType: EntityType },
  ): Promise<FetchEntitiesResult> {
    const config = getFortnoxConfig(options.entityType);

    // company_info is a single resource
    if (options.entityType === 'company_info') {
      const response = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        config.endpoint,
      );
      const raw = response[config.listKey] as Record<string, unknown>;
      const entity = mapFortnoxEntity(raw, options.entityType, config);
      return {
        entities: [entity],
        nextCursor: null,
        totalCount: 1,
        hasMore: false,
      };
    }

    const items = await this.client.getPaginated<Record<string, unknown>>(
      credentials.accessToken,
      config.endpoint,
      config.listKey,
      {
        lastModified: options.lastModifiedCursor ?? undefined,
        pageSize: options.pageSize,
      },
    );

    const entities = items.map((item) =>
      mapFortnoxEntity(item, options.entityType, config),
    );

    // Compute next cursor from latest lastModified
    const nextCursor = entities.reduce<string | null>((latest, e) => {
      if (!e.last_modified) return latest;
      if (!latest) return e.last_modified;
      return e.last_modified > latest ? e.last_modified : latest;
    }, null);

    return {
      entities,
      nextCursor,
      totalCount: entities.length,
      hasMore: false,
    };
  }

  async fetchAllEntities(
    credentials: ProviderCredentials,
    options: FetchEntitiesOptions & { entityType: EntityType },
    onProgress?: FetchProgressCallback,
  ): Promise<CanonicalEntityRecord[]> {
    const result = await this.fetchEntities(credentials, options);
    onProgress?.(result.entities.length, result.totalCount ?? result.entities.length, options.entityType);
    return result.entities;
  }

  async fetchSIE(
    credentials: ProviderCredentials,
    options: FetchSIEOptions,
  ): Promise<FetchSIEResult> {
    const sieType: SIEType = options.sieType ?? 4;

    // Get financial years to iterate
    const financialYears = await this.getFinancialYears(credentials);
    const targetYears = options.fiscalYears
      ? financialYears.filter((fy) => options.fiscalYears!.includes(fy.year))
      : financialYears;

    const files: FetchSIEResult['files'] = [];

    for (const fy of targetYears) {
      try {
        const buffer = await this.client.getBinary(
          credentials.accessToken,
          `/sie/${sieType}?financialyear=${fy.id}`,
        );

        const rawContent = decodeSIEBuffer(buffer);
        const parsed = parseSIE(rawContent);
        const kpis = calculateKPIs(parsed);

        files.push({
          fiscalYear: fy.year,
          sieType,
          rawContent,
          parsed,
          kpis,
        });
      } catch (error) {
        // Log but continue with other fiscal years
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to fetch SIE for fiscal year ${fy.year}: ${message}`);
      }
    }

    return { files };
  }

  // ============================================
  // V2 Interface — Typed Resource Operations
  // ============================================

  getResourceCapabilities(): ResourceCapabilities {
    const readTypes = Object.keys(FORTNOX_RESOURCE_CONFIGS) as ResourceType[];
    return {
      read: readTypes,
      write: [ResourceType.SalesInvoices, ResourceType.SupplierInvoices],
      subResources: {
        [ResourceType.SalesInvoices]: [ResourceType.Payments],
        [ResourceType.SupplierInvoices]: [ResourceType.Payments],
      },
    };
  }

  async listResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    const config = FORTNOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Fortnox`);
    }

    if (config.singleton) {
      const response = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        config.listEndpoint,
      );
      const raw = response[config.detailKey] as Record<string, unknown>;
      const mapped = config.mapper(raw) as T;
      return { data: [mapped], page: 1, pageSize: 1, totalCount: 1, hasMore: false };
    }

    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('limit', String(options.pageSize));
    if (options?.lastModified && config.supportsLastModified) {
      params.set('lastmodified', options.lastModified);
    }
    if (options?.fromDate) params.set('fromdate', options.fromDate);
    if (options?.toDate) params.set('todate', options.toDate);

    const separator = config.listEndpoint.includes('?') ? '&' : '?';
    const path = params.toString()
      ? `${config.listEndpoint}${separator}${params.toString()}`
      : config.listEndpoint;

    const response = await this.client.get<Record<string, unknown>>(
      credentials.accessToken,
      path,
    );

    const meta = response['MetaInformation'] as
      | { '@TotalResources': number; '@TotalPages': number; '@CurrentPage': number }
      | undefined;

    const items = (response[config.listKey] as Record<string, unknown>[]) ?? [];
    const mapped = items.map((item) => config.mapper(item) as T);

    return {
      data: mapped,
      page: meta?.['@CurrentPage'] ?? options?.page ?? 1,
      pageSize: options?.pageSize ?? items.length,
      totalCount: meta?.['@TotalResources'] ?? items.length,
      hasMore: meta ? meta['@CurrentPage'] < meta['@TotalPages'] : false,
    };
  }

  async getResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<T | null> {
    const config = FORTNOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Fortnox`);
    }

    try {
      const path = config.detailEndpoint.replace('{id}', resourceId);
      const response = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        path,
      );
      const raw = response[config.detailKey] as Record<string, unknown>;
      return config.mapper(raw) as T;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async createResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T> {
    const config = FORTNOX_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Fortnox`);
    }

    const response = await this.client.post<Record<string, unknown>>(
      credentials.accessToken,
      config.listEndpoint,
      { [config.detailKey]: data },
    );
    const raw = response[config.detailKey] as Record<string, unknown>;
    return config.mapper(raw) as T;
  }

  async listSubResource<T>(
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    if (subResourceType === ResourceType.Payments) {
      // Fortnox: payments are accessed via /invoicepayments?invoicenumber={id}
      const endpoint = parentResourceType === ResourceType.SalesInvoices
        ? '/invoicepayments'
        : '/supplierinvoicepayments';

      const params = new URLSearchParams();
      params.set('invoicenumber', parentResourceId);
      if (options?.page) params.set('page', String(options.page));

      const response = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        `${endpoint}?${params.toString()}`,
      );

      const listKey = parentResourceType === ResourceType.SalesInvoices
        ? 'InvoicePayments'
        : 'SupplierInvoicePayments';
      const items = (response[listKey] as Record<string, unknown>[]) ?? [];
      const mapped = items.map((item) => mapFortnoxToPayment(item, parentResourceId) as unknown as T);

      return {
        data: mapped,
        page: options?.page ?? 1,
        pageSize: items.length,
        totalCount: items.length,
        hasMore: false,
      };
    }

    throw new Error(`Sub-resource "${subResourceType}" is not supported for "${parentResourceType}" on Fortnox`);
  }

  async createSubResource<T>(
    credentials: ProviderCredentials,
    parentResourceType: ResourceType,
    parentResourceId: string,
    subResourceType: ResourceType,
    data: Partial<T>,
  ): Promise<T> {
    if (subResourceType === ResourceType.Payments) {
      const endpoint = parentResourceType === ResourceType.SalesInvoices
        ? '/invoicepayments'
        : '/supplierinvoicepayments';

      const detailKey = parentResourceType === ResourceType.SalesInvoices
        ? 'InvoicePayment'
        : 'SupplierInvoicePayment';

      const response = await this.client.post<Record<string, unknown>>(
        credentials.accessToken,
        endpoint,
        { [detailKey]: { InvoiceNumber: parentResourceId, ...data } },
      );
      const raw = response[detailKey] as Record<string, unknown>;
      return mapFortnoxToPayment(raw, parentResourceId) as unknown as T;
    }

    throw new Error(`Sub-resource "${subResourceType}" creation is not supported for "${parentResourceType}" on Fortnox`);
  }
}

// Self-register
registerProvider('fortnox', () => new FortnoxProvider());
