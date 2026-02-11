export enum ResourceType {
  SalesInvoices = 'salesinvoices',
  SupplierInvoices = 'supplierinvoices',
  Customers = 'customers',
  Suppliers = 'suppliers',
  Journals = 'journals',
  AccountingAccounts = 'accountingaccounts',
  CompanyInformation = 'companyinformation',
  AccountingPeriods = 'accountingperiods',
  FinancialDimensions = 'financialdimensions',
  BalanceSheet = 'balancesheet',
  IncomeStatement = 'incomestatement',
  TrialBalances = 'trialbalances',
  Payments = 'payments',
  Attachments = 'attachments',
}

/** Maps the old EntityType values to new ResourceType values */
export const ENTITY_TO_RESOURCE: Record<string, ResourceType> = {
  invoice: ResourceType.SalesInvoices,
  supplier_invoice: ResourceType.SupplierInvoices,
  customer: ResourceType.Customers,
  supplier: ResourceType.Suppliers,
  company_info: ResourceType.CompanyInformation,
  invoice_payment: ResourceType.Payments,
  supplier_invoice_payment: ResourceType.Payments,
};

/** Sub-resources that belong to a parent resource */
export const SUB_RESOURCES: Partial<Record<ResourceType, ResourceType[]>> = {
  [ResourceType.SalesInvoices]: [ResourceType.Payments, ResourceType.Attachments],
  [ResourceType.SupplierInvoices]: [ResourceType.Payments, ResourceType.Attachments],
};
