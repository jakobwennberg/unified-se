import type { AmountType } from './common.js';

export interface FinancialReportCategoryDto {
  name: string;
  amount: AmountType;
  children?: FinancialReportCategoryDto[];
  accounts?: { accountNumber: string; name?: string; amount: AmountType }[];
}

export interface BalanceSheetDto {
  fiscalYear: number;
  periodEnd: string;
  baseCurrency: string;
  assets: FinancialReportCategoryDto;
  liabilities: FinancialReportCategoryDto;
  equity: FinancialReportCategoryDto;
  _raw?: Record<string, unknown>;
}

export interface IncomeStatementDto {
  fiscalYear: number;
  periodStart: string;
  periodEnd: string;
  baseCurrency: string;
  revenue: FinancialReportCategoryDto;
  expenses: FinancialReportCategoryDto;
  netIncome: AmountType;
  _raw?: Record<string, unknown>;
}

export interface TrialBalanceEntryDto {
  accountNumber: string;
  accountName?: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceDto {
  fiscalYear: number;
  periodStart: string;
  periodEnd: string;
  baseCurrency: string;
  entries: TrialBalanceEntryDto[];
  _raw?: Record<string, unknown>;
}
