import type { AmountType, PartyDto, AllowanceChargeDto, TaxTotalDto, FinancialDimensionRef } from './common.js';
import type { InvoiceStatusCode, LegalMonetaryTotalDto, PaymentStatusDto } from './sales-invoice.js';

export interface SupplierInvoiceLineDto {
  id: string;
  description?: string;
  quantity?: number;
  unitCode?: string;
  unitPrice?: AmountType;
  lineExtensionAmount: AmountType;
  taxPercent?: number;
  taxAmount?: AmountType;
  accountNumber?: string;
  itemName?: string;
  articleNumber?: string;
  financialDimensions?: FinancialDimensionRef[];
}

export interface SupplierInvoiceDto {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  invoiceTypeCode?: string;
  currencyCode: string;
  status: InvoiceStatusCode;

  supplier: PartyDto; // issuer (the supplier)
  buyer: PartyDto; // recipient (us)

  lines: SupplierInvoiceLineDto[];
  allowanceCharges?: AllowanceChargeDto[];
  taxTotal?: TaxTotalDto;
  legalMonetaryTotal: LegalMonetaryTotalDto;
  paymentStatus: PaymentStatusDto;

  paymentTerms?: string;
  note?: string;
  ocrNumber?: string;

  financialDimensions?: FinancialDimensionRef[];

  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
