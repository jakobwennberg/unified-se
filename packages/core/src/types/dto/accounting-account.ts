export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'other';

export interface AccountingAccountDto {
  accountNumber: string;
  name: string;
  description?: string;
  type?: AccountType;
  vatCode?: string;
  active: boolean;
  balanceCarriedForward?: number;
  sruCode?: string;
  createdAt?: string;
  updatedAt?: string;
  _raw?: Record<string, unknown>;
}
