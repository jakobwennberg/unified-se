import { describe, it, expect } from 'vitest';
import {
  mapFortnoxToSalesInvoice,
  mapFortnoxToSupplierInvoice,
  mapFortnoxToCustomer,
  mapFortnoxToSupplier,
  mapFortnoxToJournal,
  mapFortnoxToAccountingAccount,
  mapFortnoxToCompanyInformation,
  mapFortnoxToPayment,
} from './typed-mapper.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic Fortnox API response shapes
// ---------------------------------------------------------------------------

const salesInvoiceFixture: Record<string, unknown> = {
  DocumentNumber: '12047',
  CustomerNumber: 'K-00312',
  CustomerName: 'Bergstr\u00f6m & Partners AB',
  OrganisationNumber: '5568901234',
  CompanyName: 'Mitt F\u00f6retag AB',
  InvoiceDate: '2024-11-15',
  DueDate: '2024-12-15',
  Total: 62500,
  Net: 50000,
  TotalVAT: 12500,
  Currency: 'SEK',
  Cancelled: false,
  Credit: false,
  Booked: true,
  Sent: true,
  FullyPaid: false,
  Balance: 62500,
  TermsOfPayment: '30',
  Remarks: 'Konsultarvode november 2024',
  YourReference: 'Erik Lindqvist',
  YourOrderNumber: 'PO-2024-0089',
  Address1: 'Vasagatan 12',
  Address2: 'Plan 3',
  City: 'Stockholm',
  ZipCode: '111 20',
  Country: 'SE',
  Email: 'faktura@bergstrom.se',
  Phone1: '08-123 45 67',
  '@LastModified': '2024-11-15T14:32:00+01:00',
  InvoiceRows: [
    {
      RowId: 1,
      ArticleNumber: 'KONS-001',
      Description: 'Konsultarvode, senior utvecklare',
      DeliveredQuantity: 80,
      Unit: 'h',
      Price: 500,
      Total: 40000,
      VAT: 25,
      AccountNumber: 3010,
    },
    {
      RowId: 2,
      ArticleNumber: 'RESA-002',
      Description: 'Reseers\u00e4ttning',
      DeliveredQuantity: 1,
      Unit: 'st',
      Price: 10000,
      Total: 10000,
      VAT: 25,
      AccountNumber: 3011,
    },
  ],
};

const supplierInvoiceFixture: Record<string, unknown> = {
  GivenNumber: '7023',
  SupplierNumber: 'L-00045',
  SupplierName: 'Kontorsm\u00f6bler Sverige AB',
  OrganisationNumber: '5590123456',
  InvoiceDate: '2024-10-01',
  DueDate: '2024-10-31',
  Total: 18750,
  Net: 15000,
  TotalVAT: 3750,
  Currency: 'SEK',
  Cancelled: false,
  Booked: true,
  Sent: false,
  Balance: 18750,
  OCR: '702300001234',
  '@LastModified': '2024-10-02T09:15:00+02:00',
  SupplierInvoiceRows: [
    {
      RowId: 1,
      Account: 5410,
      ArticleNumber: 'DESK-100',
      Description: 'Skrivbord h\u00f6j- och s\u00e4nkbart',
      Quantity: 3,
      Price: 5000,
      Total: 15000,
    },
  ],
};

const customerFixture: Record<string, unknown> = {
  CustomerNumber: 'K-00312',
  Name: 'Bergstr\u00f6m & Partners AB',
  OrganisationNumber: '5568901234',
  VATNumber: 'SE556890123401',
  Type: 'COMPANY',
  Active: true,
  Address1: 'Vasagatan 12',
  Address2: 'Plan 3',
  City: 'Stockholm',
  ZipCode: '111 20',
  Country: 'SE',
  Email: 'info@bergstrom.se',
  Phone1: '08-123 45 67',
  TermsOfPayment: '30',
  Comments: 'Nyckelkund sedan 2020',
  '@LastModified': '2024-09-10T11:00:00+02:00',
};

const privateCustomerFixture: Record<string, unknown> = {
  CustomerNumber: 'K-00999',
  Name: 'Anna Svensson',
  Type: 'PRIVATE',
  Active: true,
  Address1: 'Linn\u00e9gatan 5',
  City: 'G\u00f6teborg',
  ZipCode: '413 04',
  Country: 'SE',
  Email: 'anna.svensson@mail.se',
};

const supplierFixture: Record<string, unknown> = {
  SupplierNumber: 'L-00045',
  Name: 'Kontorsm\u00f6bler Sverige AB',
  OrganisationNumber: '5590123456',
  VATNumber: 'SE559012345601',
  Active: true,
  Address1: 'Industriv\u00e4gen 8',
  City: 'Malm\u00f6',
  ZipCode: '211 15',
  Country: 'SE',
  Email: 'order@kontorsmobler.se',
  Phone1: '040-987 65 43',
  BankAccountNumber: '1234-5, 678 901 234',
  BG: '5432-1098',
  PG: '12 34 56-7',
  TermsOfPayment: '30',
  Comments: 'Prefererad leverant\u00f6r f\u00f6r kontorsinredning',
  '@LastModified': '2024-08-20T08:45:00+02:00',
};

const voucherFixture: Record<string, unknown> = {
  VoucherNumber: 145,
  VoucherSeries: 'A',
  VoucherSeriesDescription: 'L\u00f6pande verifikationer',
  Description: 'Hyra kontor december 2024',
  TransactionDate: '2024-12-01',
  Year: 2024,
  VoucherRows: [
    {
      Account: 5010,
      AccountDescription: 'Lokalhyra',
      Debit: 25000,
      Credit: 0,
      TransactionDate: '2024-12-01',
      Description: 'Hyra dec',
    },
    {
      Account: 2641,
      AccountDescription: 'Ing\u00e5ende moms',
      Debit: 6250,
      Credit: 0,
      TransactionDate: '2024-12-01',
      Description: 'Moms hyra dec',
    },
    {
      Account: 2440,
      AccountDescription: 'Leverant\u00f6rsskulder',
      Debit: 0,
      Credit: 31250,
      TransactionDate: '2024-12-01',
      Description: 'Hyra dec skuld',
    },
  ],
};

const assetAccountFixture: Record<string, unknown> = {
  Number: 1510,
  Description: 'Kundfordringar',
  VATCode: '',
  Active: true,
  BalanceCarriedForward: 125000,
  SRU: 7511,
};

const liabilityAccountFixture: Record<string, unknown> = {
  Number: 2440,
  Description: 'Leverant\u00f6rsskulder',
  VATCode: '',
  Active: true,
  BalanceCarriedForward: -89000,
  SRU: 7521,
};

const revenueAccountFixture: Record<string, unknown> = {
  Number: 3010,
  Description: 'F\u00f6rs\u00e4ljning tj\u00e4nster, 25% moms',
  VATCode: 'MP1',
  Active: true,
  BalanceCarriedForward: 0,
  SRU: 7310,
};

const expenseAccountFixture: Record<string, unknown> = {
  Number: 5010,
  Description: 'Lokalhyra',
  VATCode: '',
  Active: true,
  BalanceCarriedForward: 0,
  SRU: 7570,
};

const highExpenseAccountFixture: Record<string, unknown> = {
  Number: 7210,
  Description: 'L\u00f6ner tj\u00e4nstem\u00e4n',
  VATCode: '',
  Active: true,
};

const inactiveAccountFixture: Record<string, unknown> = {
  Number: 3999,
  Description: '\u00d6vriga int\u00e4kter (ej anv\u00e4nd)',
  Active: false,
};

const companyInfoFixture: Record<string, unknown> = {
  CompanyName: 'Mitt F\u00f6retag AB',
  OrganizationNumber: '5561234567',
  Address: 'Drottninggatan 25',
  City: 'Stockholm',
  ZipCode: '111 51',
  Country: 'SE',
  Email: 'info@mittforetag.se',
  Phone1: '08-111 22 33',
  WWW: 'https://www.mittforetag.se',
};

const paymentFixture: Record<string, unknown> = {
  Number: '301',
  InvoiceNumber: '12047',
  Amount: 62500,
  Currency: 'SEK',
  PaymentDate: '2024-12-10',
  Reference: 'Bankgiro inbetalning',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapFortnoxToSalesInvoice', () => {
  it('maps a full invoice with rows correctly', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.id).toBe('12047');
    expect(result.invoiceNumber).toBe('12047');
    expect(result.issueDate).toBe('2024-11-15');
    expect(result.dueDate).toBe('2024-12-15');
    expect(result.currencyCode).toBe('SEK');
  });

  it('builds the supplier (issuer) party', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);
    expect(result.supplier.name).toBe('Mitt F\u00f6retag AB');
  });

  it('builds the customer (recipient) party with address and contact', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.customer.name).toBe('Bergstr\u00f6m & Partners AB');
    expect(result.customer.identifications).toEqual([
      { id: '5568901234', schemeId: 'SE:ORGNR' },
    ]);
    expect(result.customer.postalAddress).toEqual({
      streetName: 'Vasagatan 12',
      additionalStreetName: 'Plan 3',
      cityName: 'Stockholm',
      postalZone: '111 20',
      countryCode: 'SE',
    });
    expect(result.customer.legalEntity).toEqual({
      registrationName: 'Bergstr\u00f6m & Partners AB',
      companyId: '5568901234',
      companyIdSchemeId: 'SE:ORGNR',
    });
    expect(result.customer.contact?.email).toBe('faktura@bergstrom.se');
    expect(result.customer.contact?.telephone).toBe('08-123 45 67');
  });

  it('maps invoice lines', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.lines).toHaveLength(2);

    const line1 = result.lines[0];
    expect(line1.id).toBe('1');
    expect(line1.description).toBe('Konsultarvode, senior utvecklare');
    expect(line1.quantity).toBe(80);
    expect(line1.unitCode).toBe('h');
    expect(line1.unitPrice).toEqual({ value: 500, currencyCode: 'SEK' });
    expect(line1.lineExtensionAmount).toEqual({ value: 40000, currencyCode: 'SEK' });
    expect(line1.taxPercent).toBe(25);
    expect(line1.accountNumber).toBe('3010');
    expect(line1.articleNumber).toBe('KONS-001');
    expect(line1.itemName).toBe('Konsultarvode, senior utvecklare');

    const line2 = result.lines[1];
    expect(line2.id).toBe('2');
    expect(line2.articleNumber).toBe('RESA-002');
    expect(line2.lineExtensionAmount).toEqual({ value: 10000, currencyCode: 'SEK' });
  });

  it('computes legalMonetaryTotal', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.legalMonetaryTotal.lineExtensionAmount).toEqual({
      value: 50000,
      currencyCode: 'SEK',
    });
    expect(result.legalMonetaryTotal.taxInclusiveAmount).toEqual({
      value: 62500,
      currencyCode: 'SEK',
    });
    expect(result.legalMonetaryTotal.payableAmount).toEqual({
      value: 62500,
      currencyCode: 'SEK',
    });
  });

  it('computes paymentStatus when balance is outstanding', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.paymentStatus.paid).toBe(false);
    expect(result.paymentStatus.balance).toEqual({ value: 62500, currencyCode: 'SEK' });
  });

  it('derives status: booked (Booked=true, Sent=true, Balance>0)', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);
    // Booked is checked before Sent, so status is 'booked'
    expect(result.status).toBe('booked');
  });

  it('maps optional metadata fields', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);

    expect(result.paymentTerms).toBe('30');
    expect(result.note).toBe('Konsultarvode november 2024');
    expect(result.buyerReference).toBe('Erik Lindqvist');
    expect(result.orderReference).toBe('PO-2024-0089');
    expect(result.updatedAt).toBe('2024-11-15T14:32:00+01:00');
  });

  it('preserves _raw reference', () => {
    const result = mapFortnoxToSalesInvoice(salesInvoiceFixture);
    expect(result._raw).toBe(salesInvoiceFixture);
  });

  it('derives status: cancelled', () => {
    const raw: Record<string, unknown> = {
      ...salesInvoiceFixture,
      Cancelled: true,
    };
    expect(mapFortnoxToSalesInvoice(raw).status).toBe('cancelled');
  });

  it('derives status: credited', () => {
    const raw: Record<string, unknown> = {
      ...salesInvoiceFixture,
      Cancelled: false,
      Credit: true,
    };
    expect(mapFortnoxToSalesInvoice(raw).status).toBe('credited');
  });

  it('derives status: paid (FullyPaid=true)', () => {
    const raw: Record<string, unknown> = {
      ...salesInvoiceFixture,
      Cancelled: false,
      Credit: false,
      FullyPaid: true,
      Balance: 0,
    };
    const result = mapFortnoxToSalesInvoice(raw);
    expect(result.status).toBe('paid');
    expect(result.paymentStatus.paid).toBe(true);
  });

  it('derives status: paid (Balance=0 with positive total)', () => {
    const raw: Record<string, unknown> = {
      ...salesInvoiceFixture,
      Cancelled: false,
      Credit: false,
      FullyPaid: false,
      Booked: false,
      Sent: false,
      Balance: 0,
    };
    const result = mapFortnoxToSalesInvoice(raw);
    expect(result.status).toBe('paid');
  });

  it('derives status: sent', () => {
    const raw: Record<string, unknown> = {
      ...salesInvoiceFixture,
      Cancelled: false,
      Credit: false,
      FullyPaid: false,
      Booked: false,
      Sent: true,
      Balance: 62500,
    };
    expect(mapFortnoxToSalesInvoice(raw).status).toBe('sent');
  });

  it('derives status: draft when nothing is set', () => {
    const raw: Record<string, unknown> = {
      DocumentNumber: '99999',
      Total: 1000,
      Balance: 1000,
      Cancelled: false,
      Credit: false,
      FullyPaid: false,
      Booked: false,
      Sent: false,
    };
    expect(mapFortnoxToSalesInvoice(raw).status).toBe('draft');
  });

  it('defaults currency to SEK when not provided', () => {
    const raw: Record<string, unknown> = { DocumentNumber: '1', Total: 100, Balance: 100 };
    const result = mapFortnoxToSalesInvoice(raw);
    expect(result.currencyCode).toBe('SEK');
    expect(result.legalMonetaryTotal.payableAmount.currencyCode).toBe('SEK');
  });

  it('handles missing InvoiceRows gracefully', () => {
    const raw: Record<string, unknown> = { DocumentNumber: '1' };
    const result = mapFortnoxToSalesInvoice(raw);
    expect(result.lines).toEqual([]);
  });
});

describe('mapFortnoxToSupplierInvoice', () => {
  it('maps core fields correctly', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);

    expect(result.id).toBe('7023');
    expect(result.invoiceNumber).toBe('7023');
    expect(result.issueDate).toBe('2024-10-01');
    expect(result.dueDate).toBe('2024-10-31');
    expect(result.currencyCode).toBe('SEK');
    expect(result.ocrNumber).toBe('702300001234');
    expect(result.updatedAt).toBe('2024-10-02T09:15:00+02:00');
  });

  it('builds supplier party', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);

    expect(result.supplier.name).toBe('Kontorsm\u00f6bler Sverige AB');
    expect(result.supplier.identifications).toEqual([
      { id: '5590123456', schemeId: 'SE:ORGNR' },
    ]);
  });

  it('sets buyer as empty party placeholder', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);
    expect(result.buyer.name).toBe('');
  });

  it('maps supplier invoice lines', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);

    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];
    expect(line.id).toBe('1');
    expect(line.description).toBe('Skrivbord h\u00f6j- och s\u00e4nkbart');
    expect(line.quantity).toBe(3);
    expect(line.unitPrice).toEqual({ value: 5000, currencyCode: 'SEK' });
    expect(line.lineExtensionAmount).toEqual({ value: 15000, currencyCode: 'SEK' });
    expect(line.accountNumber).toBe('5410');
    expect(line.articleNumber).toBe('DESK-100');
  });

  it('computes legalMonetaryTotal', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);

    expect(result.legalMonetaryTotal.lineExtensionAmount).toEqual({
      value: 15000,
      currencyCode: 'SEK',
    });
    expect(result.legalMonetaryTotal.taxInclusiveAmount).toEqual({
      value: 18750,
      currencyCode: 'SEK',
    });
    expect(result.legalMonetaryTotal.payableAmount).toEqual({
      value: 18750,
      currencyCode: 'SEK',
    });
  });

  it('computes paymentStatus as unpaid', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);
    expect(result.paymentStatus.paid).toBe(false);
    expect(result.paymentStatus.balance).toEqual({ value: 18750, currencyCode: 'SEK' });
  });

  it('derives status: booked', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);
    expect(result.status).toBe('booked');
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToSupplierInvoice(supplierInvoiceFixture);
    expect(result._raw).toBe(supplierInvoiceFixture);
  });

  it('handles missing SupplierInvoiceRows gracefully', () => {
    const raw: Record<string, unknown> = { GivenNumber: '1' };
    const result = mapFortnoxToSupplierInvoice(raw);
    expect(result.lines).toEqual([]);
  });
});

describe('mapFortnoxToCustomer', () => {
  it('maps a company customer with full details', () => {
    const result = mapFortnoxToCustomer(customerFixture);

    expect(result.id).toBe('K-00312');
    expect(result.customerNumber).toBe('K-00312');
    expect(result.type).toBe('company');
    expect(result.active).toBe(true);
    expect(result.vatNumber).toBe('SE556890123401');
    expect(result.defaultPaymentTermsDays).toBe(30);
    expect(result.note).toBe('Nyckelkund sedan 2020');
    expect(result.updatedAt).toBe('2024-09-10T11:00:00+02:00');
  });

  it('builds party with name, legalEntity, and address', () => {
    const result = mapFortnoxToCustomer(customerFixture);

    expect(result.party.name).toBe('Bergstr\u00f6m & Partners AB');
    expect(result.party.legalEntity).toEqual({
      registrationName: 'Bergstr\u00f6m & Partners AB',
      companyId: '5568901234',
      companyIdSchemeId: 'SE:ORGNR',
    });
    expect(result.party.identifications).toEqual([
      { id: '5568901234', schemeId: 'SE:ORGNR' },
    ]);
    expect(result.party.postalAddress).toEqual({
      streetName: 'Vasagatan 12',
      additionalStreetName: 'Plan 3',
      cityName: 'Stockholm',
      postalZone: '111 20',
      countryCode: 'SE',
    });
    expect(result.party.contact?.email).toBe('info@bergstrom.se');
    expect(result.party.contact?.telephone).toBe('08-123 45 67');
  });

  it('maps a private customer', () => {
    const result = mapFortnoxToCustomer(privateCustomerFixture);

    expect(result.type).toBe('private');
    expect(result.party.name).toBe('Anna Svensson');
    expect(result.party.legalEntity).toBeUndefined();
    expect(result.party.identifications).toEqual([]);
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToCustomer(customerFixture);
    expect(result._raw).toBe(customerFixture);
  });

  it('defaults active to true when not explicitly false', () => {
    const raw: Record<string, unknown> = { CustomerNumber: '1', Name: 'Test' };
    expect(mapFortnoxToCustomer(raw).active).toBe(true);
  });

  it('sets active to false when Active is false', () => {
    const raw: Record<string, unknown> = { CustomerNumber: '1', Name: 'Test', Active: false };
    expect(mapFortnoxToCustomer(raw).active).toBe(false);
  });
});

describe('mapFortnoxToSupplier', () => {
  it('maps core supplier fields', () => {
    const result = mapFortnoxToSupplier(supplierFixture);

    expect(result.id).toBe('L-00045');
    expect(result.supplierNumber).toBe('L-00045');
    expect(result.active).toBe(true);
    expect(result.vatNumber).toBe('SE559012345601');
    expect(result.defaultPaymentTermsDays).toBe(30);
    expect(result.note).toBe('Prefererad leverant\u00f6r f\u00f6r kontorsinredning');
    expect(result.updatedAt).toBe('2024-08-20T08:45:00+02:00');
  });

  it('builds party with address and contact', () => {
    const result = mapFortnoxToSupplier(supplierFixture);

    expect(result.party.name).toBe('Kontorsm\u00f6bler Sverige AB');
    expect(result.party.legalEntity).toEqual({
      registrationName: 'Kontorsm\u00f6bler Sverige AB',
      companyId: '5590123456',
      companyIdSchemeId: 'SE:ORGNR',
    });
    expect(result.party.postalAddress?.streetName).toBe('Industriv\u00e4gen 8');
    expect(result.party.postalAddress?.cityName).toBe('Malm\u00f6');
    expect(result.party.contact?.email).toBe('order@kontorsmobler.se');
    expect(result.party.contact?.telephone).toBe('040-987 65 43');
  });

  it('includes bank details', () => {
    const result = mapFortnoxToSupplier(supplierFixture);

    expect(result.bankAccount).toBe('1234-5, 678 901 234');
    expect(result.bankGiro).toBe('5432-1098');
    expect(result.plusGiro).toBe('12 34 56-7');
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToSupplier(supplierFixture);
    expect(result._raw).toBe(supplierFixture);
  });

  it('handles supplier without bank details', () => {
    const raw: Record<string, unknown> = {
      SupplierNumber: 'L-00099',
      Name: 'Enkel Leverant\u00f6r HB',
    };
    const result = mapFortnoxToSupplier(raw);
    expect(result.bankAccount).toBeUndefined();
    expect(result.bankGiro).toBeUndefined();
    expect(result.plusGiro).toBeUndefined();
  });
});

describe('mapFortnoxToJournal', () => {
  it('maps voucher header fields', () => {
    const result = mapFortnoxToJournal(voucherFixture);

    expect(result.id).toBe('A-145');
    expect(result.journalNumber).toBe('145');
    expect(result.description).toBe('Hyra kontor december 2024');
    expect(result.registrationDate).toBe('2024-12-01');
    expect(result.fiscalYear).toBe(2024);
  });

  it('maps voucher series', () => {
    const result = mapFortnoxToJournal(voucherFixture);

    expect(result.series).toEqual({
      id: 'A',
      description: 'L\u00f6pande verifikationer',
    });
  });

  it('maps voucher rows as accounting entries', () => {
    const result = mapFortnoxToJournal(voucherFixture);

    expect(result.entries).toHaveLength(3);

    const debitEntry = result.entries[0];
    expect(debitEntry.accountNumber).toBe('5010');
    expect(debitEntry.accountName).toBe('Lokalhyra');
    expect(debitEntry.debit).toBe(25000);
    expect(debitEntry.credit).toBe(0);
    expect(debitEntry.transactionDate).toBe('2024-12-01');
    expect(debitEntry.description).toBe('Hyra dec');

    const vatEntry = result.entries[1];
    expect(vatEntry.accountNumber).toBe('2641');
    expect(vatEntry.accountName).toBe('Ing\u00e5ende moms');
    expect(vatEntry.debit).toBe(6250);
    expect(vatEntry.credit).toBe(0);

    const creditEntry = result.entries[2];
    expect(creditEntry.accountNumber).toBe('2440');
    expect(creditEntry.accountName).toBe('Leverant\u00f6rsskulder');
    expect(creditEntry.debit).toBe(0);
    expect(creditEntry.credit).toBe(31250);
  });

  it('entries sum to zero (debit == credit)', () => {
    const result = mapFortnoxToJournal(voucherFixture);

    const totalDebit = result.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = result.entries.reduce((sum, e) => sum + e.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToJournal(voucherFixture);
    expect(result._raw).toBe(voucherFixture);
  });

  it('handles missing VoucherRows', () => {
    const raw: Record<string, unknown> = {
      VoucherNumber: 1,
      VoucherSeries: 'B',
      TransactionDate: '2024-01-01',
    };
    const result = mapFortnoxToJournal(raw);
    expect(result.entries).toEqual([]);
  });

  it('omits series when VoucherSeries is absent', () => {
    const raw: Record<string, unknown> = {
      VoucherNumber: 1,
      TransactionDate: '2024-01-01',
    };
    const result = mapFortnoxToJournal(raw);
    expect(result.series).toBeUndefined();
  });
});

describe('mapFortnoxToAccountingAccount', () => {
  it('maps an asset account (1xxx range)', () => {
    const result = mapFortnoxToAccountingAccount(assetAccountFixture);

    expect(result.accountNumber).toBe('1510');
    expect(result.name).toBe('Kundfordringar');
    expect(result.type).toBe('asset');
    expect(result.active).toBe(true);
    expect(result.balanceCarriedForward).toBe(125000);
    expect(result.sruCode).toBe('7511');
  });

  it('maps a liability account (2xxx range)', () => {
    const result = mapFortnoxToAccountingAccount(liabilityAccountFixture);

    expect(result.accountNumber).toBe('2440');
    expect(result.name).toBe('Leverant\u00f6rsskulder');
    expect(result.type).toBe('liability');
    expect(result.balanceCarriedForward).toBe(-89000);
    expect(result.sruCode).toBe('7521');
  });

  it('maps a revenue account (3xxx range)', () => {
    const result = mapFortnoxToAccountingAccount(revenueAccountFixture);

    expect(result.accountNumber).toBe('3010');
    expect(result.name).toBe('F\u00f6rs\u00e4ljning tj\u00e4nster, 25% moms');
    expect(result.type).toBe('revenue');
    expect(result.vatCode).toBe('MP1');
    expect(result.sruCode).toBe('7310');
  });

  it('maps an expense account (4xxx range)', () => {
    const result = mapFortnoxToAccountingAccount(expenseAccountFixture);

    expect(result.accountNumber).toBe('5010');
    expect(result.name).toBe('Lokalhyra');
    expect(result.type).toBe('expense');
    expect(result.sruCode).toBe('7570');
  });

  it('maps an expense account in the higher range (7xxx)', () => {
    const result = mapFortnoxToAccountingAccount(highExpenseAccountFixture);

    expect(result.accountNumber).toBe('7210');
    expect(result.name).toBe('L\u00f6ner tj\u00e4nstem\u00e4n');
    expect(result.type).toBe('expense');
  });

  it('sets type to undefined for accounts outside known ranges', () => {
    const raw: Record<string, unknown> = { Number: 9999, Description: 'Ok\u00e4nt konto', Active: true };
    const result = mapFortnoxToAccountingAccount(raw);
    expect(result.type).toBeUndefined();
  });

  it('handles inactive account', () => {
    const result = mapFortnoxToAccountingAccount(inactiveAccountFixture);

    expect(result.active).toBe(false);
    expect(result.type).toBe('revenue'); // 3999 is still in 3xxx range
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToAccountingAccount(assetAccountFixture);
    expect(result._raw).toBe(assetAccountFixture);
  });

  it('handles missing optional fields', () => {
    const raw: Record<string, unknown> = { Number: 1930, Description: 'F\u00f6retagskonto' };
    const result = mapFortnoxToAccountingAccount(raw);

    expect(result.accountNumber).toBe('1930');
    expect(result.type).toBe('asset');
    expect(result.vatCode).toBeUndefined();
    expect(result.balanceCarriedForward).toBeUndefined();
    expect(result.sruCode).toBeUndefined();
    // Active defaults to true when not explicitly false
    expect(result.active).toBe(true);
  });
});

describe('mapFortnoxToCompanyInformation', () => {
  it('maps company name and organization number', () => {
    const result = mapFortnoxToCompanyInformation(companyInfoFixture);

    expect(result.companyName).toBe('Mitt F\u00f6retag AB');
    expect(result.organizationNumber).toBe('5561234567');
  });

  it('builds legalEntity', () => {
    const result = mapFortnoxToCompanyInformation(companyInfoFixture);

    expect(result.legalEntity).toEqual({
      registrationName: 'Mitt F\u00f6retag AB',
      companyId: '5561234567',
      companyIdSchemeId: 'SE:ORGNR',
    });
  });

  it('maps address', () => {
    const result = mapFortnoxToCompanyInformation(companyInfoFixture);

    expect(result.address).toEqual({
      streetName: 'Drottninggatan 25',
      cityName: 'Stockholm',
      postalZone: '111 51',
      countryCode: 'SE',
    });
  });

  it('maps contact details including website', () => {
    const result = mapFortnoxToCompanyInformation(companyInfoFixture);

    expect(result.contact).toEqual({
      email: 'info@mittforetag.se',
      telephone: '08-111 22 33',
      website: 'https://www.mittforetag.se',
    });
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToCompanyInformation(companyInfoFixture);
    expect(result._raw).toBe(companyInfoFixture);
  });

  it('handles minimal company info', () => {
    const raw: Record<string, unknown> = { CompanyName: 'Litet AB' };
    const result = mapFortnoxToCompanyInformation(raw);

    expect(result.companyName).toBe('Litet AB');
    expect(result.organizationNumber).toBeUndefined();
    expect(result.legalEntity?.companyId).toBeUndefined();
    expect(result.address?.streetName).toBeUndefined();
    expect(result.contact?.email).toBeUndefined();
  });
});

describe('mapFortnoxToPayment', () => {
  it('maps payment fields correctly', () => {
    const result = mapFortnoxToPayment(paymentFixture);

    expect(result.id).toBe('301');
    expect(result.paymentNumber).toBe('301');
    expect(result.invoiceId).toBe('12047');
    expect(result.paymentDate).toBe('2024-12-10');
    expect(result.amount).toEqual({ value: 62500, currencyCode: 'SEK' });
    expect(result.reference).toBe('Bankgiro inbetalning');
  });

  it('uses provided invoiceId over raw InvoiceNumber', () => {
    const result = mapFortnoxToPayment(paymentFixture, 'OVERRIDE-123');
    expect(result.invoiceId).toBe('OVERRIDE-123');
  });

  it('preserves _raw', () => {
    const result = mapFortnoxToPayment(paymentFixture);
    expect(result._raw).toBe(paymentFixture);
  });

  it('defaults currency to SEK when not provided', () => {
    const raw: Record<string, unknown> = {
      Number: '1',
      Amount: 100,
      PaymentDate: '2024-01-01',
    };
    const result = mapFortnoxToPayment(raw);
    expect(result.amount.currencyCode).toBe('SEK');
  });
});
