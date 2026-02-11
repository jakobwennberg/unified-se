import type { AmountType, PartyDto, AllowanceChargeDto, TaxTotalDto, FinancialDimensionRef } from './common.js';

export type InvoiceStatusCode = 'draft' | 'sent' | 'booked' | 'paid' | 'overdue' | 'cancelled' | 'credited';

export interface LegalMonetaryTotalDto {
  lineExtensionAmount: AmountType;
  taxExclusiveAmount?: AmountType;
  taxInclusiveAmount?: AmountType;
  allowanceTotalAmount?: AmountType;
  chargeTotalAmount?: AmountType;
  payableRoundingAmount?: AmountType;
  payableAmount: AmountType;
}

export interface PaymentStatusDto {
  paid: boolean;
  balance: AmountType;
  lastPaymentDate?: string;
}

export interface SalesInvoiceLineDto {
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

export interface SalesInvoiceDto {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  invoiceTypeCode?: string; // 380 = Invoice, 381 = Credit note
  currencyCode: string;
  status: InvoiceStatusCode;

  supplier: PartyDto; // issuer
  customer: PartyDto; // recipient

  lines: SalesInvoiceLineDto[];
  allowanceCharges?: AllowanceChargeDto[];
  taxTotal?: TaxTotalDto;
  legalMonetaryTotal: LegalMonetaryTotalDto;
  paymentStatus: PaymentStatusDto;

  paymentTerms?: string;
  note?: string;
  buyerReference?: string;
  orderReference?: string;

  financialDimensions?: FinancialDimensionRef[];

  /** ISO 8601 */
  createdAt?: string;
  updatedAt?: string;
  /** Provider-specific raw data */
  _raw?: Record<string, unknown>;
}
