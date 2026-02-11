import type { PartyDto, PostalAddress, FinancialDimensionRef } from './common.js';

export interface SupplierDto {
  id: string;
  supplierNumber: string;
  party: PartyDto;
  deliveryAddresses?: PostalAddress[];
  financialDimensions?: FinancialDimensionRef[];
  active: boolean;
  vatNumber?: string;
  bankAccount?: string;
  bankGiro?: string;
  plusGiro?: string;
  defaultPaymentTermsDays?: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
