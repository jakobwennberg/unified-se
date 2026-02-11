/** Visma eEkonomi (Spiris) API types derived from Swagger spec */

/** OData pagination metadata */
export interface VismaPaginationMeta {
  CurrentPage: number;
  PageSize: number;
  TotalNumberOfPages: number;
  TotalNumberOfResults: number;
  ServerTimeUtc?: string;
}

/** Generic paginated response wrapper */
export interface VismaPaginatedResponse<T> {
  Meta: VismaPaginationMeta;
  Data: T[];
}

/** Visma Customer Invoice */
export interface VismaCustomerInvoice {
  Id: string;
  InvoiceNumber: number;
  CustomerId: string;
  CustomerNumber: string;
  InvoiceCustomerName: string;
  InvoiceDate: string;
  DueDate: string;
  TotalAmount: number;
  TotalAmountInvoiceCurrency: number;
  RemainingAmount: number;
  CurrencyCode: string;
  CreatedUtc: string;
  ModifiedUtc: string;
  SendType?: number;
  Rows?: unknown[];
  [key: string]: unknown;
}

/** Visma Customer */
export interface VismaCustomer {
  Id: string;
  CustomerNumber: string;
  Name: string;
  EmailAddress?: string;
  CorporateIdentityNumber?: string;
  InvoiceAddress1?: string;
  InvoiceCity?: string;
  CountryCode?: string;
  Telephone?: string;
  IsActive: boolean;
  ChangedUtc: string;
  [key: string]: unknown;
}

/** Visma Supplier */
export interface VismaSupplier {
  Id: string;
  SupplierNumber: string;
  Name: string;
  EmailAddress?: string;
  CorporateIdentityNumber?: string;
  Address1?: string;
  City?: string;
  CountryCode?: string;
  IsActive: boolean;
  ModifiedUtc: string;
  [key: string]: unknown;
}

/** Visma Supplier Invoice */
export interface VismaSupplierInvoice {
  Id: string;
  InvoiceNumber: number;
  SupplierId: string;
  SupplierName: string;
  SupplierNumber: string;
  InvoiceDate: string;
  DueDate: string;
  TotalAmount: number;
  CurrencyCode: string;
  RemainingAmount: number;
  ModifiedUtc: string;
  [key: string]: unknown;
}

/** Visma Company Settings (singleton) */
export interface VismaCompanySettings {
  Name: string;
  CorporateIdentityNumber: string;
  Email?: string;
  Phone?: string;
  Address1?: string;
  City?: string;
  CountryCode?: string;
  PostalCode?: string;
  CurrencyCode?: string;
  [key: string]: unknown;
}

/** Visma Fiscal Year */
export interface VismaFiscalYear {
  Id: string;
  StartDate: string;
  EndDate: string;
  IsLockedForAccounting: boolean;
  [key: string]: unknown;
}

/** Visma Order */
export interface VismaOrder {
  Id: string;
  Number: number;
  CustomerId: string;
  OrderDate: string;
  Amount: number;
  CurrencyCode: string;
  Status: number;
  ModifiedUtc: string;
  [key: string]: unknown;
}

/** Visma SIE export response */
export interface VismaSIEExportResponse {
  TemporaryUrl: string;
}

/** Visma OAuth2 token response */
export interface VismaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** Visma OAuth2 config */
export interface VismaOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
