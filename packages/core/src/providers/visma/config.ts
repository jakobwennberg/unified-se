import type { EntityType } from '../../types/entity.js';

export interface VismaEntityConfig {
  endpoint: string;
  idField: string;
  incremental: boolean;
  /** The field used for incremental sync (varies by entity) */
  modifiedField?: string;
  dateField?: string;
  dueDateField?: string;
  counterpartyNumberField?: string;
  counterpartyNameField?: string;
  amountField?: string;
  currencyField?: string;
  /** Whether this is a singleton resource (no pagination) */
  singleton?: boolean;
}

export const VISMA_ENTITY_CONFIGS: Record<string, VismaEntityConfig> = {
  invoice: {
    endpoint: '/customerinvoices',
    idField: 'InvoiceNumber',
    incremental: true,
    modifiedField: 'ModifiedUtc',
    dateField: 'InvoiceDate',
    dueDateField: 'DueDate',
    counterpartyNumberField: 'CustomerNumber',
    counterpartyNameField: 'InvoiceCustomerName',
    amountField: 'TotalAmount',
    currencyField: 'CurrencyCode',
  },
  customer: {
    endpoint: '/customers',
    idField: 'CustomerNumber',
    incremental: true,
    modifiedField: 'ChangedUtc',
    counterpartyNumberField: 'CustomerNumber',
    counterpartyNameField: 'Name',
  },
  supplier: {
    endpoint: '/suppliers',
    idField: 'SupplierNumber',
    incremental: true,
    modifiedField: 'ModifiedUtc',
    counterpartyNumberField: 'SupplierNumber',
    counterpartyNameField: 'Name',
  },
  supplier_invoice: {
    endpoint: '/supplierinvoices',
    idField: 'InvoiceNumber',
    incremental: true,
    modifiedField: 'ModifiedUtc',
    dateField: 'InvoiceDate',
    dueDateField: 'DueDate',
    counterpartyNumberField: 'SupplierNumber',
    counterpartyNameField: 'SupplierName',
    amountField: 'TotalAmount',
    currencyField: 'CurrencyCode',
  },
  order: {
    endpoint: '/orders',
    idField: 'Number',
    incremental: true,
    modifiedField: 'ModifiedUtc',
    dateField: 'OrderDate',
    amountField: 'Amount',
    currencyField: 'CurrencyCode',
  },
  company_info: {
    endpoint: '/companysettings',
    idField: 'CorporateIdentityNumber',
    incremental: false,
    counterpartyNameField: 'Name',
    singleton: true,
  },
} satisfies Record<string, VismaEntityConfig>;

export function getVismaConfig(entityType: EntityType): VismaEntityConfig {
  const config = VISMA_ENTITY_CONFIGS[entityType];
  if (!config) {
    throw new Error(`No Visma config for entity type: ${entityType}`);
  }
  return config;
}

export const VISMA_BASE_URL = 'https://eaccountingapi.vismaonline.com/v2';
export const VISMA_AUTH_URL = 'https://identity.vismaonline.com/connect/authorize';
export const VISMA_TOKEN_URL = 'https://identity.vismaonline.com/connect/token';
export const VISMA_REVOKE_URL = 'https://identity.vismaonline.com/connect/revocation';
export const VISMA_RATE_LIMIT = { maxRequests: 10, windowMs: 1000 };
