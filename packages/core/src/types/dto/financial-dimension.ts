export interface FinancialDimensionValueDto {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface FinancialDimensionDto {
  id: string;
  name: string;
  description?: string;
  values: FinancialDimensionValueDto[];
  _raw?: Record<string, unknown>;
}
