import type { EntityType } from '../../types/entity.js';

export interface FortnoxEntityConfig {
  endpoint: string;
  listKey: string;
  idField: string;
  incremental: boolean;
  dateField?: string;
  dueDateField?: string;
  counterpartyNumberField?: string;
  counterpartyNameField?: string;
  amountField?: string;
  currencyField?: string;
  statusField?: string;
  lastModifiedField?: string;
}

export const FORTNOX_ENTITY_CONFIGS: Record<string, FortnoxEntityConfig> = {
  invoice: {
    endpoint: '/invoices',
    listKey: 'Invoices',
    idField: 'DocumentNumber',
    incremental: true,
    dateField: 'InvoiceDate',
    dueDateField: 'DueDate',
    counterpartyNumberField: 'CustomerNumber',
    counterpartyNameField: 'CustomerName',
    amountField: 'Total',
    currencyField: 'Currency',
    lastModifiedField: '@LastModified',
  },
  customer: {
    endpoint: '/customers',
    listKey: 'Customers',
    idField: 'CustomerNumber',
    incremental: true,
    counterpartyNumberField: 'CustomerNumber',
    counterpartyNameField: 'Name',
    lastModifiedField: '@LastModified',
  },
  supplier: {
    endpoint: '/suppliers',
    listKey: 'Suppliers',
    idField: 'SupplierNumber',
    incremental: true,
    counterpartyNumberField: 'SupplierNumber',
    counterpartyNameField: 'Name',
    lastModifiedField: '@LastModified',
  },
  supplier_invoice: {
    endpoint: '/supplierinvoices',
    listKey: 'SupplierInvoices',
    idField: 'GivenNumber',
    incremental: true,
    dateField: 'InvoiceDate',
    dueDateField: 'DueDate',
    counterpartyNumberField: 'SupplierNumber',
    counterpartyNameField: 'SupplierName',
    amountField: 'Total',
    currencyField: 'Currency',
    lastModifiedField: '@LastModified',
  },
  invoice_payment: {
    endpoint: '/invoicepayments',
    listKey: 'InvoicePayments',
    idField: 'Number',
    incremental: false,
    dateField: 'PaymentDate',
    amountField: 'Amount',
    currencyField: 'Currency',
  },
  supplier_invoice_payment: {
    endpoint: '/supplierinvoicepayments',
    listKey: 'SupplierInvoicePayments',
    idField: 'Number',
    incremental: false,
    dateField: 'PaymentDate',
    amountField: 'Amount',
    currencyField: 'Currency',
  },
  employee: {
    endpoint: '/employees',
    listKey: 'Employees',
    idField: 'EmployeeId',
    incremental: false,
    counterpartyNameField: 'FullName',
  },
  asset: {
    endpoint: '/assets',
    listKey: 'Assets',
    idField: 'Number',
    incremental: false,
    dateField: 'AcquisitionDate',
    amountField: 'AcquisitionValue',
  },
  company_info: {
    endpoint: '/companyinformation',
    listKey: 'CompanyInformation',
    idField: 'OrganizationNumber',
    incremental: false,
    counterpartyNameField: 'CompanyName',
  },
} satisfies Record<string, FortnoxEntityConfig>;

export function getFortnoxConfig(entityType: EntityType): FortnoxEntityConfig {
  const config = FORTNOX_ENTITY_CONFIGS[entityType];
  if (!config) {
    throw new Error(`No Fortnox config for entity type: ${entityType}`);
  }
  return config;
}

export const FORTNOX_BASE_URL = 'https://api.fortnox.se/3';
export const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
export const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
export const FORTNOX_RATE_LIMIT = { maxRequests: 25, windowMs: 1000 };
