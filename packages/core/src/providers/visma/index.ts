import type { AccountingProviderV2, ResourceCapabilities, ResourceQueryOptions } from '../base-v2.js';
import type { ProviderCapabilities, ProviderCredentials, CompanyInfo, FinancialYear } from '../../types/provider.js';
import type { FetchEntitiesOptions, FetchEntitiesResult, CanonicalEntityRecord, EntityType, FetchProgressCallback } from '../../types/entity.js';
import type { FetchSIEOptions, FetchSIEResult, SIEType } from '../../types/sie.js';
import type { PaginatedResponse } from '../../types/dto/common.js';
import { ResourceType } from '../../types/dto/resource-type.js';
import type { VismaCompanySettings, VismaFiscalYear } from './types.js';
import { VismaClient } from './client.js';
import { getVismaConfig, VISMA_ENTITY_CONFIGS, VISMA_RATE_LIMIT } from './config.js';
import { mapVismaEntity } from './mapper.js';
import { registerProvider } from '../index.js';
import { decodeSIEBuffer } from '../../sie/encoding.js';
import { parseSIE } from '../../sie/parser.js';
import { calculateKPIs } from '../../sie/kpi.js';
import type { VismaPaginatedResponse } from './types.js';
import { VISMA_RESOURCE_CONFIGS } from './resource-config.js';

export class VismaProvider implements AccountingProviderV2 {
  readonly name = 'visma' as const;
  private readonly client: VismaClient;

  constructor(client?: VismaClient) {
    this.client = client ?? new VismaClient();
  }

  getCapabilities(): ProviderCapabilities {
    return {
      name: 'visma',
      displayName: 'Visma eEkonomi',
      supportedEntityTypes: Object.keys(VISMA_ENTITY_CONFIGS) as EntityType[],
      supportsSIE: true,
      sieTypes: [4],
      supportsIncrementalSync: true,
      incrementalSyncEntities: Object.entries(VISMA_ENTITY_CONFIGS)
        .filter(([_, cfg]) => cfg.incremental)
        .map(([key]) => key as EntityType),
      authType: 'oauth2',
      rateLimits: VISMA_RATE_LIMIT,
    };
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<boolean> {
    try {
      await this.client.get<VismaCompanySettings>(
        credentials.accessToken,
        '/companysettings',
      );
      return true;
    } catch {
      return false;
    }
  }

  async getCompanyInfo(credentials: ProviderCredentials): Promise<CompanyInfo> {
    const info = await this.client.get<VismaCompanySettings>(
      credentials.accessToken,
      '/companysettings',
    );

    return {
      companyName: info.Name ?? '',
      organizationNumber: info.CorporateIdentityNumber ?? null,
      address: info.Address1 ?? null,
      city: info.City ?? null,
      country: info.CountryCode ?? null,
      email: info.Email ?? null,
      phone: info.Phone ?? null,
      raw: info as unknown as Record<string, unknown>,
    };
  }

  async getFinancialYears(credentials: ProviderCredentials): Promise<FinancialYear[]> {
    const response = await this.client.getPaginated<VismaFiscalYear>(
      credentials.accessToken,
      '/fiscalyears',
    );

    return response.map((fy) => {
      const year = parseInt(fy.EndDate.slice(0, 4), 10);
      return {
        id: fy.Id,
        fromDate: fy.StartDate,
        toDate: fy.EndDate,
        year,
      };
    });
  }

  async fetchEntities(
    credentials: ProviderCredentials,
    options: FetchEntitiesOptions & { entityType: EntityType },
  ): Promise<FetchEntitiesResult> {
    const config = getVismaConfig(options.entityType);

    // company_info is a singleton
    if (config.singleton) {
      const raw = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        config.endpoint,
      );
      const entity = mapVismaEntity(raw, options.entityType, config);
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
      {
        modifiedSince: options.lastModifiedCursor ?? undefined,
        modifiedField: config.modifiedField,
        pageSize: options.pageSize,
      },
    );

    const entities = items.map((item) =>
      mapVismaEntity(item, options.entityType, config),
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

    const financialYears = await this.getFinancialYears(credentials);
    const targetYears = options.fiscalYears
      ? financialYears.filter((fy) => options.fiscalYears!.includes(fy.year))
      : financialYears;

    const files: FetchSIEResult['files'] = [];

    for (const fy of targetYears) {
      try {
        const buffer = await this.client.getBinary(
          credentials.accessToken,
          `/sie4export/${fy.fromDate}/${fy.toDate}`,
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
    const readTypes = Object.keys(VISMA_RESOURCE_CONFIGS) as ResourceType[];
    return {
      read: readTypes,
      write: [ResourceType.SalesInvoices],
      subResources: {},
    };
  }

  async listResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    const config = VISMA_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Visma`);
    }

    if (config.singleton) {
      const raw = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        config.listEndpoint,
      );
      const mapped = config.mapper(raw) as T;
      return { data: [mapped], page: 1, pageSize: 1, totalCount: 1, hasMore: false };
    }

    // Build OData query
    const params = new URLSearchParams();
    const pageSize = options?.pageSize ?? 100;
    const page = options?.page ?? 1;
    params.set('$top', String(pageSize));
    params.set('$skip', String((page - 1) * pageSize));

    if (options?.lastModified && config.supportsModifiedFilter && config.modifiedField) {
      params.set('$filter', `${config.modifiedField} gt ${options.lastModified}`);
    }

    const separator = config.listEndpoint.includes('?') ? '&' : '?';
    const path = `${config.listEndpoint}${separator}${params.toString()}`;

    const response = await this.client.get<{ Meta?: { TotalNumberOfResults?: number; TotalNumberOfPages?: number; CurrentPage?: number }; Data?: Record<string, unknown>[] }>(
      credentials.accessToken,
      path,
    );

    const items = response.Data ?? [];
    const mapped = items.map((item) => config.mapper(item) as T);

    return {
      data: mapped,
      page: response.Meta?.CurrentPage ?? page,
      pageSize,
      totalCount: response.Meta?.TotalNumberOfResults ?? items.length,
      hasMore: response.Meta ? (response.Meta.CurrentPage ?? 1) < (response.Meta.TotalNumberOfPages ?? 1) : false,
    };
  }

  async getResource<T>(
    credentials: ProviderCredentials,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<T | null> {
    const config = VISMA_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Visma`);
    }

    try {
      const path = config.detailEndpoint.replace('{id}', resourceId);
      const raw = await this.client.get<Record<string, unknown>>(
        credentials.accessToken,
        path,
      );
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
    const config = VISMA_RESOURCE_CONFIGS[resourceType];
    if (!config) {
      throw new Error(`Resource type "${resourceType}" is not supported by Visma`);
    }

    const response = await this.client.post<Record<string, unknown>>(
      credentials.accessToken,
      config.listEndpoint,
      data as Record<string, unknown>,
    );
    return config.mapper(response) as T;
  }

  async listSubResource<T>(
    _credentials: ProviderCredentials,
    _parentResourceType: ResourceType,
    _parentResourceId: string,
    subResourceType: ResourceType,
    _options?: ResourceQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    throw new Error(`Sub-resource "${subResourceType}" is not supported by Visma`);
  }

  async createSubResource<T>(
    _credentials: ProviderCredentials,
    _parentResourceType: ResourceType,
    _parentResourceId: string,
    subResourceType: ResourceType,
    _data?: Partial<T>,
  ): Promise<T> {
    throw new Error(`Sub-resource "${subResourceType}" creation is not supported by Visma`);
  }
}

// Self-register
registerProvider('visma', () => new VismaProvider());
