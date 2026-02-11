export type PeriodStatus = 'open' | 'closed' | 'locked';

export interface AccountingPeriodDto {
  id: string;
  fiscalYear: number;
  fromDate: string;
  toDate: string;
  status?: PeriodStatus;
  description?: string;
  _raw?: Record<string, unknown>;
}
