import type { SalesInvoiceDto, SalesInvoiceLineDto, InvoiceStatusCode, LegalMonetaryTotalDto, PaymentStatusDto } from '../../types/dto/sales-invoice.js';
import type { SupplierInvoiceDto, SupplierInvoiceLineDto } from '../../types/dto/supplier-invoice.js';
import type { CustomerDto } from '../../types/dto/customer.js';
import type { SupplierDto } from '../../types/dto/supplier.js';
import type { JournalDto, AccountingEntryDto } from '../../types/dto/journal.js';
import type { AccountingAccountDto, AccountType } from '../../types/dto/accounting-account.js';
import type { CompanyInformationDto } from '../../types/dto/company-information.js';
import type { PaymentDto } from '../../types/dto/payment.js';
import type { AmountType, PartyDto } from '../../types/dto/common.js';

function amount(value: number | undefined | null, currency: string = 'SEK'): AmountType {
  return { value: value ?? 0, currencyCode: currency };
}

function deriveInvoiceStatus(raw: Record<string, unknown>): InvoiceStatusCode {
  if (raw['Cancelled'] === true) return 'cancelled';
  if (raw['Credit'] === true) return 'credited';
  if (raw['FullyPaid'] === true || raw['Balance'] === 0) return 'paid';
  if (raw['Booked'] === true) return 'booked';
  if (raw['Sent'] === true) return 'sent';
  return 'draft';
}

function buildParty(name: string, orgNumber?: string, address?: Record<string, unknown>): PartyDto {
  return {
    name,
    identifications: orgNumber ? [{ id: orgNumber, schemeId: 'SE:ORGNR' }] : [],
    postalAddress: address ? {
      streetName: (address['Address1'] ?? address['Address']) as string | undefined,
      additionalStreetName: address['Address2'] as string | undefined,
      cityName: (address['City'] ?? address['CityName']) as string | undefined,
      postalZone: (address['ZipCode'] ?? address['PostalCode']) as string | undefined,
      countryCode: address['Country'] as string | undefined,
    } : undefined,
    legalEntity: orgNumber ? {
      registrationName: name,
      companyId: orgNumber,
      companyIdSchemeId: 'SE:ORGNR',
    } : undefined,
    contact: {
      email: (address?.['Email'] ?? address?.['EmailInvoice']) as string | undefined,
      telephone: address?.['Phone1'] as string | undefined,
    },
  };
}

export function mapFortnoxToSalesInvoice(raw: Record<string, unknown>): SalesInvoiceDto {
  const currency = (raw['Currency'] as string) ?? 'SEK';
  const total = raw['Total'] as number ?? 0;
  const balance = raw['Balance'] as number ?? 0;

  const rows = (raw['InvoiceRows'] as Record<string, unknown>[] | undefined) ?? [];
  const lines: SalesInvoiceLineDto[] = rows.map((row, idx) => ({
    id: String(row['RowId'] ?? idx + 1),
    description: row['Description'] as string | undefined,
    quantity: row['DeliveredQuantity'] as number | undefined,
    unitCode: row['Unit'] as string | undefined,
    unitPrice: row['Price'] != null ? amount(row['Price'] as number, currency) : undefined,
    lineExtensionAmount: amount(row['Total'] as number ?? 0, currency),
    taxPercent: row['VAT'] as number | undefined,
    accountNumber: row['AccountNumber'] != null ? String(row['AccountNumber']) : undefined,
    articleNumber: row['ArticleNumber'] as string | undefined,
    itemName: row['Description'] as string | undefined,
  }));

  const legalMonetaryTotal: LegalMonetaryTotalDto = {
    lineExtensionAmount: amount(raw['Net'] as number ?? total, currency),
    taxInclusiveAmount: amount(total, currency),
    payableAmount: amount(total, currency),
  };

  const paymentStatus: PaymentStatusDto = {
    paid: balance === 0 && total > 0,
    balance: amount(balance, currency),
  };

  return {
    id: String(raw['DocumentNumber'] ?? ''),
    invoiceNumber: String(raw['DocumentNumber'] ?? ''),
    issueDate: (raw['InvoiceDate'] as string) ?? '',
    dueDate: raw['DueDate'] as string | undefined,
    currencyCode: currency,
    status: deriveInvoiceStatus(raw),
    supplier: buildParty(
      (raw['CompanyName'] ?? '') as string,
      raw['OrganisationNumber'] as string | undefined,
    ),
    customer: buildParty(
      (raw['CustomerName'] ?? '') as string,
      raw['OrganisationNumber'] as string | undefined,
      raw as Record<string, unknown>,
    ),
    lines,
    legalMonetaryTotal,
    paymentStatus,
    paymentTerms: raw['TermsOfPayment'] as string | undefined,
    note: raw['Remarks'] as string | undefined,
    buyerReference: raw['YourReference'] as string | undefined,
    orderReference: raw['YourOrderNumber'] as string | undefined,
    updatedAt: raw['@LastModified'] as string | undefined,
    _raw: raw,
  };
}

export function mapFortnoxToSupplierInvoice(raw: Record<string, unknown>): SupplierInvoiceDto {
  const currency = (raw['Currency'] as string) ?? 'SEK';
  const total = raw['Total'] as number ?? 0;
  const balance = raw['Balance'] as number ?? 0;

  const rows = (raw['SupplierInvoiceRows'] as Record<string, unknown>[] | undefined) ?? [];
  const lines: SupplierInvoiceLineDto[] = rows.map((row, idx) => ({
    id: String(row['RowId'] ?? idx + 1),
    description: row['Description'] as string | undefined,
    quantity: row['Quantity'] as number | undefined,
    unitPrice: row['Price'] != null ? amount(row['Price'] as number, currency) : undefined,
    lineExtensionAmount: amount(row['Total'] as number ?? 0, currency),
    accountNumber: row['Account'] != null ? String(row['Account']) : undefined,
    articleNumber: row['ArticleNumber'] as string | undefined,
  }));

  const legalMonetaryTotal: LegalMonetaryTotalDto = {
    lineExtensionAmount: amount(raw['Net'] as number ?? total, currency),
    taxInclusiveAmount: amount(total, currency),
    payableAmount: amount(total, currency),
  };

  const paymentStatus: PaymentStatusDto = {
    paid: balance === 0 && total > 0,
    balance: amount(balance, currency),
  };

  return {
    id: String(raw['GivenNumber'] ?? ''),
    invoiceNumber: String(raw['GivenNumber'] ?? ''),
    issueDate: (raw['InvoiceDate'] as string) ?? '',
    dueDate: raw['DueDate'] as string | undefined,
    currencyCode: currency,
    status: deriveInvoiceStatus(raw),
    supplier: buildParty(
      (raw['SupplierName'] ?? '') as string,
      raw['OrganisationNumber'] as string | undefined,
    ),
    buyer: buildParty(''), // populated by company info
    lines,
    legalMonetaryTotal,
    paymentStatus,
    ocrNumber: raw['OCR'] as string | undefined,
    updatedAt: raw['@LastModified'] as string | undefined,
    _raw: raw,
  };
}

export function mapFortnoxToCustomer(raw: Record<string, unknown>): CustomerDto {
  const name = (raw['Name'] as string) ?? '';
  const orgNumber = raw['OrganisationNumber'] as string | undefined;

  return {
    id: String(raw['CustomerNumber'] ?? ''),
    customerNumber: String(raw['CustomerNumber'] ?? ''),
    type: raw['Type'] === 'PRIVATE' ? 'private' : 'company',
    party: buildParty(name, orgNumber, raw),
    active: raw['Active'] !== false,
    vatNumber: raw['VATNumber'] as string | undefined,
    defaultPaymentTermsDays: raw['TermsOfPayment'] != null ? Number(raw['TermsOfPayment']) : undefined,
    note: raw['Comments'] as string | undefined,
    updatedAt: raw['@LastModified'] as string | undefined,
    _raw: raw,
  };
}

export function mapFortnoxToSupplier(raw: Record<string, unknown>): SupplierDto {
  const name = (raw['Name'] as string) ?? '';
  const orgNumber = raw['OrganisationNumber'] as string | undefined;

  return {
    id: String(raw['SupplierNumber'] ?? ''),
    supplierNumber: String(raw['SupplierNumber'] ?? ''),
    party: buildParty(name, orgNumber, raw),
    active: raw['Active'] !== false,
    vatNumber: raw['VATNumber'] as string | undefined,
    bankAccount: raw['BankAccountNumber'] as string | undefined,
    bankGiro: raw['BG'] as string | undefined,
    plusGiro: raw['PG'] as string | undefined,
    defaultPaymentTermsDays: raw['TermsOfPayment'] != null ? Number(raw['TermsOfPayment']) : undefined,
    note: raw['Comments'] as string | undefined,
    updatedAt: raw['@LastModified'] as string | undefined,
    _raw: raw,
  };
}

export function mapFortnoxToJournal(raw: Record<string, unknown>): JournalDto {
  const voucherRows = (raw['VoucherRows'] as Record<string, unknown>[] | undefined) ?? [];
  const entries: AccountingEntryDto[] = voucherRows.map((row) => ({
    accountNumber: String(row['Account'] ?? ''),
    accountName: row['AccountDescription'] as string | undefined,
    debit: (row['Debit'] as number) ?? 0,
    credit: (row['Credit'] as number) ?? 0,
    transactionDate: row['TransactionDate'] as string | undefined,
    description: row['Description'] as string | undefined,
  }));

  return {
    id: `${raw['VoucherSeries'] ?? ''}${raw['VoucherNumber'] ?? ''}`,
    journalNumber: String(raw['VoucherNumber'] ?? ''),
    series: raw['VoucherSeries'] ? {
      id: String(raw['VoucherSeries']),
      description: raw['VoucherSeriesDescription'] as string | undefined,
    } : undefined,
    description: raw['Description'] as string | undefined,
    registrationDate: (raw['TransactionDate'] as string) ?? '',
    fiscalYear: raw['Year'] != null ? Number(raw['Year']) : undefined,
    entries,
    _raw: raw,
  };
}

export function mapFortnoxToAccountingAccount(raw: Record<string, unknown>): AccountingAccountDto {
  let type: AccountType | undefined;
  const num = Number(raw['Number']);
  if (num >= 1000 && num < 2000) type = 'asset';
  else if (num >= 2000 && num < 3000) type = 'liability';
  else if (num >= 3000 && num < 4000) type = 'revenue';
  else if (num >= 4000 && num < 9000) type = 'expense';

  return {
    accountNumber: String(raw['Number'] ?? ''),
    name: (raw['Description'] as string) ?? '',
    type,
    vatCode: raw['VATCode'] as string | undefined,
    active: raw['Active'] !== false,
    balanceCarriedForward: raw['BalanceCarriedForward'] as number | undefined,
    sruCode: raw['SRU'] != null ? String(raw['SRU']) : undefined,
    _raw: raw,
  };
}

export function mapFortnoxToCompanyInformation(raw: Record<string, unknown>): CompanyInformationDto {
  return {
    companyName: (raw['CompanyName'] as string) ?? '',
    organizationNumber: raw['OrganizationNumber'] as string | undefined,
    legalEntity: {
      registrationName: (raw['CompanyName'] as string) ?? '',
      companyId: raw['OrganizationNumber'] as string | undefined,
      companyIdSchemeId: 'SE:ORGNR',
    },
    address: {
      streetName: raw['Address'] as string | undefined,
      cityName: raw['City'] as string | undefined,
      postalZone: raw['ZipCode'] as string | undefined,
      countryCode: raw['Country'] as string | undefined,
    },
    contact: {
      email: raw['Email'] as string | undefined,
      telephone: raw['Phone1'] as string | undefined,
      website: raw['WWW'] as string | undefined,
    },
    _raw: raw,
  };
}

export function mapFortnoxToPayment(raw: Record<string, unknown>, invoiceId?: string): PaymentDto {
  return {
    id: String(raw['Number'] ?? ''),
    paymentNumber: String(raw['Number'] ?? ''),
    invoiceId: invoiceId ?? String(raw['InvoiceNumber'] ?? ''),
    paymentDate: (raw['PaymentDate'] as string) ?? '',
    amount: amount(raw['Amount'] as number ?? 0, (raw['Currency'] as string) ?? 'SEK'),
    reference: raw['Reference'] as string | undefined,
    _raw: raw,
  };
}
