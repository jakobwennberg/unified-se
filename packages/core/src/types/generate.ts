import type { SIEParseResult, SIEKPIs } from './sie.js';

export type CompanyIndustry =
  | 'consulting'
  | 'retail'
  | 'manufacturing'
  | 'restaurant'
  | 'construction'
  | 'saas'
  | 'healthcare'
  | 'transport'
  | 'real_estate';

export type CompanySize = 'micro' | 'small' | 'medium';

export interface GenerateCompanyRequest {
  /** Industry type. AI picks if omitted. */
  industry?: CompanyIndustry;
  /** Company size. Default: 'small' */
  size?: CompanySize;
  /** Fiscal year to generate. Default: current year - 1 */
  fiscalYear?: number;
  /** Generate previous year data for YoY comparisons. Default: true */
  includePreviousYear?: boolean;
}

export interface CompanyProfile {
  companyName: string;
  orgNumber: string;
  industry: CompanyIndustry;
  size: CompanySize;
  description: string;
}

export interface GenerateCompanyResult {
  profile: CompanyProfile;
  sieData: SIEParseResult;
  /** The downloadable SIE file content */
  sieText: string;
  kpis: SIEKPIs;
}
