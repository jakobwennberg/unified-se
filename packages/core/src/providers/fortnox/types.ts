/** Fortnox API pagination metadata */
export interface FortnoxMetaInformation {
  '@TotalResources': number;
  '@TotalPages': number;
  '@CurrentPage': number;
}

/** Generic paginated response wrapper */
export interface FortnoxPaginatedResponse<T> {
  MetaInformation: FortnoxMetaInformation;
  [key: string]: T[] | FortnoxMetaInformation | unknown;
}

/** Fortnox Invoice (list) */
export interface FortnoxInvoice {
  DocumentNumber: string;
  CustomerNumber: string;
  CustomerName: string;
  InvoiceDate: string;
  DueDate: string;
  Total: number;
  Currency: string;
  Cancelled: boolean;
  Booked: boolean;
  Sent: boolean;
  Balance: number;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Customer (list) */
export interface FortnoxCustomer {
  CustomerNumber: string;
  Name: string;
  Email?: string;
  OrganisationNumber?: string;
  City?: string;
  Address1?: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Supplier (list) */
export interface FortnoxSupplier {
  SupplierNumber: string;
  Name: string;
  Email?: string;
  OrganisationNumber?: string;
  City?: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Supplier Invoice (list) */
export interface FortnoxSupplierInvoice {
  GivenNumber: string;
  SupplierNumber: string;
  SupplierName: string;
  InvoiceDate: string;
  DueDate: string;
  Total: number;
  Currency: string;
  Cancelled: boolean;
  Booked: boolean;
  Balance: number;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Invoice Payment (list) */
export interface FortnoxInvoicePayment {
  Number: string;
  InvoiceNumber: string;
  Amount: number;
  Currency?: string;
  PaymentDate: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Supplier Invoice Payment (list) */
export interface FortnoxSupplierInvoicePayment {
  Number: string;
  InvoiceNumber: string;
  Amount: number;
  Currency?: string;
  PaymentDate: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Employee (list) */
export interface FortnoxEmployee {
  EmployeeId: string;
  FullName?: string;
  PersonalIdentityNumber?: string;
  City?: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Asset (list) */
export interface FortnoxAsset {
  Number: string;
  Description?: string;
  AcquisitionValue?: number;
  AcquisitionDate?: string;
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox CompanyInformation (single resource) */
export interface FortnoxCompanyInformation {
  OrganizationNumber: string;
  CompanyName: string;
  Address: string;
  City: string;
  Country: string;
  Email: string;
  Phone1: string;
  [key: string]: unknown;
}

/** Fortnox Financial Year */
export interface FortnoxFinancialYear {
  Id: number;
  FromDate: string;
  ToDate: string;
  '@url'?: string;
}

/** Fortnox OAuth2 token response */
export interface FortnoxTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Fortnox OAuth2 config */
export interface FortnoxOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Fortnox Invoice Row (detail level) */
export interface FortnoxInvoiceRow {
  RowId?: number;
  ArticleNumber?: string;
  Description?: string;
  DeliveredQuantity?: number;
  Unit?: string;
  Price?: number;
  Total?: number;
  VAT?: number;
  AccountNumber?: number;
  [key: string]: unknown;
}

/** Fortnox Invoice (detail level - includes rows) */
export interface FortnoxInvoiceDetail extends FortnoxInvoice {
  InvoiceRows: FortnoxInvoiceRow[];
  Net?: number;
  TotalVAT?: number;
  Balance: number;
  Credit?: boolean;
  FullyPaid?: boolean;
  TermsOfPayment?: string;
  Remarks?: string;
  YourReference?: string;
  YourOrderNumber?: string;
}

/** Fortnox Supplier Invoice Row (detail level) */
export interface FortnoxSupplierInvoiceRow {
  RowId?: number;
  Account?: number;
  ArticleNumber?: string;
  Description?: string;
  Quantity?: number;
  Price?: number;
  Total?: number;
  [key: string]: unknown;
}

/** Fortnox Supplier Invoice (detail level) */
export interface FortnoxSupplierInvoiceDetail extends FortnoxSupplierInvoice {
  SupplierInvoiceRows: FortnoxSupplierInvoiceRow[];
  Net?: number;
  TotalVAT?: number;
  Balance: number;
  OCR?: string;
}

/** Fortnox Voucher Row */
export interface FortnoxVoucherRow {
  Account: number;
  AccountDescription?: string;
  Debit: number;
  Credit: number;
  TransactionDate?: string;
  Description?: string;
  [key: string]: unknown;
}

/** Fortnox Voucher (detail level) */
export interface FortnoxVoucher {
  VoucherNumber: number;
  VoucherSeries: string;
  VoucherSeriesDescription?: string;
  Description?: string;
  TransactionDate: string;
  Year?: number;
  VoucherRows: FortnoxVoucherRow[];
  '@url'?: string;
  [key: string]: unknown;
}

/** Fortnox Account (detail level) */
export interface FortnoxAccount {
  Number: number;
  Description: string;
  VATCode?: string;
  Active: boolean;
  BalanceCarriedForward?: number;
  SRU?: number;
  '@url'?: string;
  [key: string]: unknown;
}
