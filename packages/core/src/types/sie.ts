/**
 * SIE (Standard Import Export) types for Swedish accounting data.
 * SIE is the standard file format for exchanging accounting data
 * between Swedish bookkeeping systems.
 *
 * Types ported from arcim's production SIE parser to ensure compatibility
 * with real-world SIE files from Fortnox, Visma/Spiris, Bokio, and BL.
 */

/** SIE file type (1-4) */
export type SIEType = 1 | 2 | 3 | 4;

export type SIEBalanceType = 'IB' | 'UB' | 'RES';

export interface SIEMetadata {
  companyName: string;
  currency: string;
  generatedDate: string | null;
  sieType: string | null;
  fiscalYearStart: string | null;
  fiscalYearEnd: string | null;
  /** Organization number (#ORGNR) */
  orgNumber?: string;
  /** #OMFATTN — date of last transaction (actual period end for partial years) */
  omfattnDate?: string;
}

export interface SIEAccount {
  accountNumber: string;
  accountName: string;
  /** BAS account group (e.g. "1 - Tillgångar") */
  accountGroup: string;
  /** SRU tax reporting code (Fortnox) */
  taxCode?: string;
}

export interface SIEDimension {
  dimensionType: number;
  code: string;
  name: string;
}

export interface SIEBalance {
  accountNumber: string;
  /** 'IB' = opening, 'UB' = closing, 'RES' = result (income statement) */
  balanceType: SIEBalanceType;
  /** 0 = current year, -1 = previous year, etc. */
  yearIndex: number;
  amount: number;
  quantity?: number;
}

/**
 * Flattened transaction row — each row is a standalone record
 * that includes verification context. This matches the arcim production
 * model and makes querying/aggregating simpler.
 */
export interface SIETransaction {
  verificationSeries: string;
  verificationNumber: string;
  verificationDate: string;
  verificationText: string;
  accountNumber: string;
  amount: number;
  costCenter: string;
  project: string;
  rowText: string;
  quantity?: number;
  /** Registration date from #VER field 5, if present */
  registrationDate?: string;
}

export interface SIEParseResult {
  metadata: SIEMetadata;
  accounts: SIEAccount[];
  dimensions: SIEDimension[];
  transactions: SIETransaction[];
  balances: SIEBalance[];
}

export interface SIEKPIs {
  // ===== BALANCE SHEET ITEMS =====
  totalAssets: number;
  fixedAssets: number;
  currentAssets: number;
  inventory: number;
  customerReceivables: number;
  cashAndBank: number;

  totalEquity: number;
  /** Obeskattade reserver (2100-2199) */
  untaxedReserves: number;
  /** Justerat EK = equity + (reserves * 0.794) + YTD result */
  adjustedEquity: number;
  /** Latent skatteskuld = reserves * 0.206 */
  deferredTaxLiability: number;

  /** Avsättningar (2200-2299) */
  provisions: number;
  longTermLiabilities: number;
  currentLiabilities: number;
  totalLiabilities: number;
  /** Interest-bearing: 2310-2359 + 2840-2849 */
  interestBearingDebt: number;
  /** Interest-bearing - Cash */
  netDebt: number;
  accountsPayable: number;

  // ===== INCOME STATEMENT ITEMS =====
  /** 3000-3699 minus 3700-3799 */
  netSales: number;
  totalOperatingIncome: number;
  costOfGoodsSold: number;
  grossProfit: number;
  externalCosts: number;
  personnelCosts: number;
  writeDowns: number;
  depreciation: number;
  ebitda: number;
  /** Rörelseresultat */
  ebit: number;
  financialIncome: number;
  interestExpenses: number;
  financialNet: number;
  resultBeforeTax: number;
  tax: number;
  /** Årets resultat */
  netIncome: number;

  // ===== MARGIN KPIs =====
  /** Bruttomarginal */
  grossMargin: number | null;
  /** EBITDA-marginal */
  ebitdaMargin: number | null;
  /** Rörelsemarginal */
  operatingMargin: number | null;
  /** Vinstmarginal (före skatt) */
  profitMargin: number | null;
  /** Nettomarginal */
  netMargin: number | null;

  // ===== RETURN KPIs (using averages, annualized) =====
  roa: number | null;
  roe: number | null;
  roce: number | null;

  // ===== CAPITAL STRUCTURE KPIs =====
  /** Soliditet (uses adjusted EK) */
  equityRatio: number | null;
  /** Skuldsättningsgrad (uses adjusted EK) */
  debtToEquityRatio: number | null;
  /** D/E = Interest-bearing / Adjusted EK */
  deRatio: number | null;
  netDebtToEbitda: number | null;
  /** Räntetäckningsgrad */
  interestCoverageRatio: number | null;

  // ===== LIQUIDITY KPIs =====
  cashRatio: number | null;
  /** Kassalikviditet */
  quickRatio: number | null;
  /** Balanslikviditet */
  currentRatio: number | null;
  workingCapital: number | null;
  workingCapitalRatio: number | null;

  // ===== EFFICIENCY KPIs (annualized) =====
  /** Days Inventory Outstanding */
  dio: number | null;
  /** Days Sales Outstanding */
  dso: number | null;
  /** Days Payables Outstanding */
  dpo: number | null;
  /** Cash Conversion Cycle */
  ccc: number | null;
  /** Kapitalomsättning */
  assetTurnover: number | null;

  // ===== GROWTH KPIs (year-over-year) =====
  revenueGrowth: number | null;
  assetGrowth: number | null;
  equityGrowth: number | null;

  // ===== METADATA =====
  annualizationFactor: number;
  daysInPeriod: number;
  isPartialYear: boolean;
}

export interface SIEUpload {
  uploadId: string;
  connectionId: string;
  fiscalYear: number;
  sieType: SIEType;
  fileName?: string;
  accountCount: number;
  transactionCount: number;
  uploadedAt: string;
}

export interface SIEFullData {
  uploadId?: string;
  connectionId: string;
  fiscalYear: number;
  sieType: SIEType;
  parsed: SIEParseResult;
  kpis: SIEKPIs;
  rawContent?: string;
}

export interface FetchSIEOptions {
  sieType?: SIEType;
  fiscalYears?: number[];
}

export interface FetchSIEResult {
  files: Array<{
    fiscalYear: number;
    sieType: SIEType;
    rawContent: string;
    parsed: SIEParseResult;
    kpis: SIEKPIs;
  }>;
}
