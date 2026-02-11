import type { AmountType, FinancialDimensionRef } from './common.js';

export interface AccountingEntryDto {
  accountNumber: string;
  accountName?: string;
  debit: number;
  credit: number;
  transactionDate?: string;
  description?: string;
  financialDimensions?: FinancialDimensionRef[];
}

export interface AccountingSeriesDto {
  id: string;
  description?: string;
}

export interface JournalDto {
  id: string;
  journalNumber: string;
  series?: AccountingSeriesDto;
  description?: string;
  registrationDate: string;
  fiscalYear?: number;
  entries: AccountingEntryDto[];
  totalDebit?: AmountType;
  totalCredit?: AmountType;
  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
