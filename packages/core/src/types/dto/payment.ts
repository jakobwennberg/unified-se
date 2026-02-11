import type { AmountType } from './common.js';

export type PaymentMethodCode = 'bank_transfer' | 'card' | 'cash' | 'autogiro' | 'bankgiro' | 'plusgiro' | 'swish' | 'other';

export interface PaymentDto {
  id: string;
  paymentNumber?: string;
  invoiceId: string;
  paymentDate: string;
  amount: AmountType;
  paymentMethod?: PaymentMethodCode;
  reference?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
