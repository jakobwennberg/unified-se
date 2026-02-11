import { ResourceType } from '../../types/dto/resource-type.js';
import {
  mapFortnoxToSalesInvoice,
  mapFortnoxToSupplierInvoice,
  mapFortnoxToCustomer,
  mapFortnoxToSupplier,
  mapFortnoxToJournal,
  mapFortnoxToAccountingAccount,
  mapFortnoxToCompanyInformation,
} from './typed-mapper.js';

export interface FortnoxResourceConfig {
  /** Fortnox API list endpoint */
  listEndpoint: string;
  /** Key in list response containing the array */
  listKey: string;
  /** Fortnox API detail endpoint (with {id} placeholder) */
  detailEndpoint: string;
  /** Key in detail response containing the object */
  detailKey: string;
  /** ID field in the list response objects */
  idField: string;
  /** Mapper function from raw Fortnox data to typed DTO */
  mapper: (raw: Record<string, unknown>) => unknown;
  /** Whether this resource supports lastmodified filter */
  supportsLastModified: boolean;
  /** Whether this resource is a single resource (not a list) */
  singleton?: boolean;
  /** Build the detail path from a composite resourceId (e.g. voucher series+number) */
  resolveDetailPath?: (resourceId: string, query?: Record<string, string>) => string;
  /** Whether this resource supports entry hydration via detail fetches */
  supportsEntryHydration?: boolean;
}

export const FORTNOX_RESOURCE_CONFIGS: Partial<Record<ResourceType, FortnoxResourceConfig>> = {
  [ResourceType.SalesInvoices]: {
    listEndpoint: '/invoices',
    listKey: 'Invoices',
    detailEndpoint: '/invoices/{id}',
    detailKey: 'Invoice',
    idField: 'DocumentNumber',
    mapper: mapFortnoxToSalesInvoice,
    supportsLastModified: true,
  },
  [ResourceType.SupplierInvoices]: {
    listEndpoint: '/supplierinvoices',
    listKey: 'SupplierInvoices',
    detailEndpoint: '/supplierinvoices/{id}',
    detailKey: 'SupplierInvoice',
    idField: 'GivenNumber',
    mapper: mapFortnoxToSupplierInvoice,
    supportsLastModified: true,
  },
  [ResourceType.Customers]: {
    listEndpoint: '/customers',
    listKey: 'Customers',
    detailEndpoint: '/customers/{id}',
    detailKey: 'Customer',
    idField: 'CustomerNumber',
    mapper: mapFortnoxToCustomer,
    supportsLastModified: true,
  },
  [ResourceType.Suppliers]: {
    listEndpoint: '/suppliers',
    listKey: 'Suppliers',
    detailEndpoint: '/suppliers/{id}',
    detailKey: 'Supplier',
    idField: 'SupplierNumber',
    mapper: mapFortnoxToSupplier,
    supportsLastModified: true,
  },
  [ResourceType.Journals]: {
    listEndpoint: '/vouchers',
    listKey: 'Vouchers',
    detailEndpoint: '/vouchers/{id}',
    detailKey: 'Voucher',
    idField: 'VoucherNumber',
    mapper: mapFortnoxToJournal,
    supportsLastModified: false,
    supportsEntryHydration: true,
    resolveDetailPath: (resourceId, query) => {
      const dashIdx = resourceId.indexOf('-');
      const series = dashIdx >= 0 ? resourceId.slice(0, dashIdx) : resourceId;
      const number = dashIdx >= 0 ? resourceId.slice(dashIdx + 1) : resourceId;
      const fy = query?.['financialyear'] ?? '';
      const params = fy ? `?financialyear=${fy}` : '';
      return `/vouchers/${series}/${number}${params}`;
    },
  },
  [ResourceType.AccountingAccounts]: {
    listEndpoint: '/accounts',
    listKey: 'Accounts',
    detailEndpoint: '/accounts/{id}',
    detailKey: 'Account',
    idField: 'Number',
    mapper: mapFortnoxToAccountingAccount,
    supportsLastModified: false,
  },
  [ResourceType.CompanyInformation]: {
    listEndpoint: '/companyinformation',
    listKey: 'CompanyInformation',
    detailEndpoint: '/companyinformation',
    detailKey: 'CompanyInformation',
    idField: 'OrganizationNumber',
    mapper: mapFortnoxToCompanyInformation,
    supportsLastModified: false,
    singleton: true,
  },
};
