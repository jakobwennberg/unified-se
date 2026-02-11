import type { PartyDto, PostalAddress, FinancialDimensionRef } from './common.js';

export type CustomerType = 'company' | 'private';

export interface CustomerDto {
  id: string;
  customerNumber: string;
  type?: CustomerType;
  party: PartyDto;
  deliveryAddresses?: PostalAddress[];
  financialDimensions?: FinancialDimensionRef[];
  active: boolean;
  vatNumber?: string;
  defaultPaymentTermsDays?: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
