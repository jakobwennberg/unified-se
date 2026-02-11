/**
 * SIE-based Financial KPI Calculator
 *
 * Calculates comprehensive financial KPIs from SIE (Standard Import Export) account balances.
 * Uses Swedish BAS (Baskontoplan) account classification per SIE_Nyckeltal_Referens_v2.md.
 *
 * KPIs Calculated:
 * - Margins: Gross, EBITDA, Operating, Profit, Net
 * - Returns: ROA, ROE, ROCE
 * - Capital Structure: Soliditet, Skuldsättningsgrad, D/E, Räntetäckningsgrad
 * - Liquidity: Cash Ratio, Kassalikviditet, Balanslikviditet, Rörelsekapital
 * - Efficiency: DIO, DSO, DPO, CCC, Kapitalomsättning
 * - Growth: Revenue, Assets, Equity (YoY)
 *
 * Features:
 * - Justerat Eget Kapital (Adjusted Equity) per Swedish accounting standards
 * - Partial-year annualization using OMFATTN date
 * - Year-over-year comparisons using period -1 data
 */

import {
  SWEDISH_ACCOUNTS,
  sumAccountsInRange,
  CORPORATE_TAX_RATE,
  EQUITY_PORTION_OF_UNTAXED_RESERVES,
  AccountRange,
} from './swedish-account-ranges';
import logger from './logger';
import type { SIEMetadata } from './sie-parser';

export interface SIEBalance {
  accountNumber: string;
  balanceType: 'IB' | 'UB' | 'RES'; // IB=Opening, UB=Closing, RES=Result/P&L
  yearIndex: number; // 0=current, -1=previous year
  amount: number;
}

export interface CalculatedKPIs {
  // ========== BALANCE SHEET ITEMS ==========
  totalAssets: number;
  fixedAssets: number;
  currentAssets: number;
  inventory: number;
  customerReceivables: number;
  cashAndBank: number;

  totalEquity: number; // Raw equity (2080-2099)
  untaxedReserves: number; // Obeskattade reserver (2100-2199)
  adjustedEquity: number; // Justerat EK = equity + (reserves * 0.794)
  deferredTaxLiability: number; // Latent skatteskuld = reserves * 0.206

  provisions: number; // Avsättningar (2200-2299)
  longTermLiabilities: number;
  currentLiabilities: number;
  totalLiabilities: number;
  interestBearingDebt: number; // 2310-2359 + 2840-2849
  netDebt: number; // Interest-bearing - Cash

  accountsPayable: number;

  // ========== INCOME STATEMENT ITEMS ==========
  netSales: number; // 3000-3699 minus 3700-3799
  totalOperatingIncome: number; // 3000-3999
  costOfGoodsSold: number;
  grossProfit: number;
  externalCosts: number;
  personnelCosts: number;
  writeDowns: number;
  depreciation: number;
  ebitda: number;
  ebit: number; // = Rörelseresultat
  financialIncome: number;
  interestExpenses: number;
  financialNet: number;
  resultBeforeTax: number;
  tax: number;
  netIncome: number; // Årets resultat

  // ========== MARGIN KPIs ==========
  grossMargin: number | null; // Bruttomarginal
  ebitdaMargin: number | null; // EBITDA-marginal
  operatingMargin: number | null; // Rörelsemarginal
  profitMargin: number | null; // Vinstmarginal (före skatt)
  netMargin: number | null; // Nettomarginal

  // ========== RETURN KPIs (using averages, annualized) ==========
  roa: number | null; // Return on Assets
  roe: number | null; // Return on Equity (adjusted)
  roce: number | null; // Return on Capital Employed

  // ========== CAPITAL STRUCTURE KPIs ==========
  equityRatio: number | null; // Soliditet (uses adjusted EK)
  debtToEquityRatio: number | null; // Skuldsättningsgrad (uses adjusted EK)
  deRatio: number | null; // D/E = Interest-bearing / Adjusted EK
  netDebtToEbitda: number | null;
  interestCoverageRatio: number | null; // Räntetäckningsgrad

  // ========== LIQUIDITY KPIs ==========
  cashRatio: number | null;
  quickRatio: number | null; // Kassalikviditet
  currentRatio: number | null; // Balanslikviditet
  workingCapital: number | null;
  workingCapitalRatio: number | null;

  // ========== EFFICIENCY KPIs (annualized) ==========
  dio: number | null; // Days Inventory Outstanding
  dso: number | null; // Days Sales Outstanding
  dpo: number | null; // Days Payables Outstanding
  ccc: number | null; // Cash Conversion Cycle
  assetTurnover: number | null; // Kapitalomsättning

  // ========== GROWTH KPIs (year-over-year) ==========
  revenueGrowth: number | null;
  assetGrowth: number | null;
  equityGrowth: number | null;

  // ========== METADATA ==========
  annualizationFactor: number;
  daysInPeriod: number;
  isPartialYear: boolean;
}

// Legacy interface for backward compatibility
export interface LegacyCalculatedKPIs {
  ebitda: number | null;
  interestCoverageRatio: number | null;
  debtToEquityRatio: number | null;
  netDebtToEbitda: number | null;
  equityRatio: number | null;
  quickRatio: number | null;
  workingCapital: number | null;
  operatingProfit: number;
  depreciation: number;
  interestExpenses: number;
  totalAssets: number;
  totalEquity: number;
  totalLiabilities: number;
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  cashAndBank: number;
  interestBearingDebt: number;
}

/**
 * Calculate annualization factor for partial-year data
 * Uses OMFATTN date if available, otherwise fiscal year end
 */
function calculateAnnualizationFactor(metadata?: Partial<SIEMetadata>): {
  factor: number;
  days: number;
  isPartial: boolean;
} {
  if (!metadata?.fiscalYearStart) {
    return { factor: 1.0, days: 365, isPartial: false };
  }

  // Use OMFATTN if available, otherwise fiscal year end
  const startDate = new Date(metadata.fiscalYearStart);
  const endDate = metadata.omfattnDate
    ? new Date(metadata.omfattnDate)
    : metadata.fiscalYearEnd
      ? new Date(metadata.fiscalYearEnd)
      : null;

  if (!endDate) {
    return { factor: 1.0, days: 365, isPartial: false };
  }

  const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Consider it a partial year if significantly different from 365 days
  const isPartial = days < 350 || days > 380;
  const factor = isPartial ? 365 / days : 1.0;

  return { factor, days, isPartial };
}

/**
 * Calculate average of IB and UB for a balance sheet item
 * Falls back to UB only if IB not available
 */
function calculateAverage(
  balances: SIEBalance[],
  range: AccountRange,
  yearIndex: number = 0
): number {
  const ibBalances = balances.filter((b) => b.balanceType === 'IB' && b.yearIndex === yearIndex);
  const ubBalances = balances.filter((b) => b.balanceType === 'UB' && b.yearIndex === yearIndex);

  const ib = sumAccountsInRange(ibBalances, range);
  const ub = sumAccountsInRange(ubBalances, range);

  // If we have both IB and UB, use average
  if (ibBalances.length > 0 && ubBalances.length > 0) {
    return (ib + ub) / 2;
  }

  // Fall back to UB if IB not available
  if (ubBalances.length > 0) {
    return ub;
  }

  return ib;
}

/**
 * Calculate adjusted equity for a specific year (IB, UB, or average)
 * Includes YTD result from RES accounts for current year (yearIndex 0)
 */
function calculateAdjustedEquityValue(
  balances: SIEBalance[],
  balanceType: 'IB' | 'UB' | 'AVG',
  yearIndex: number = 0
): number {
  // Calculate YTD result from income statement accounts (only for current year)
  // YTD result is added to UB and AVG, but not IB (opening balance is before current year earnings)
  let ytdResult = 0;
  if (yearIndex === 0 && balanceType !== 'IB') {
    const resBalances = balances.filter((b) => b.balanceType === 'RES' && b.yearIndex === 0);
    ytdResult = -sumAccountsInRange(resBalances, { min: 3000, max: 8999 });
  }

  if (balanceType === 'AVG') {
    const avgEquity = Math.abs(calculateAverage(balances, SWEDISH_ACCOUNTS.EQUITY.ALL, yearIndex));
    const avgReserves = Math.abs(calculateAverage(balances, SWEDISH_ACCOUNTS.UNTAXED_RESERVES.ALL, yearIndex));
    // For AVG, add half the YTD result (since it applies to closing but not opening)
    return avgEquity + avgReserves * EQUITY_PORTION_OF_UNTAXED_RESERVES + ytdResult / 2;
  }

  const filteredBalances = balances.filter((b) => b.balanceType === balanceType && b.yearIndex === yearIndex);
  const equity = Math.abs(sumAccountsInRange(filteredBalances, SWEDISH_ACCOUNTS.EQUITY.ALL));
  const reserves = Math.abs(sumAccountsInRange(filteredBalances, SWEDISH_ACCOUNTS.UNTAXED_RESERVES.ALL));
  return equity + reserves * EQUITY_PORTION_OF_UNTAXED_RESERVES + ytdResult;
}

/**
 * Calculate comprehensive financial KPIs from SIE account balances
 *
 * @param balances - Array of SIE account balances
 * @param metadata - Optional SIE metadata for annualization (partial allowed)
 * @returns Calculated KPIs with supporting data
 */
export function calculateKPIsFromSIE(balances: SIEBalance[], metadata?: Partial<SIEMetadata>): CalculatedKPIs {
  // Filter for current fiscal year only
  const currentYear = balances.filter((b) => b.yearIndex === 0);

  // Separate balance sheet (UB = closing balances) and income statement (RES = result accounts)
  const balanceSheet = currentYear.filter((b) => b.balanceType === 'UB');
  const incomeStatement = currentYear.filter((b) => b.balanceType === 'RES');
  const openingBalances = currentYear.filter((b) => b.balanceType === 'IB');

  // Calculate annualization
  const { factor: annFactor, days, isPartial } = calculateAnnualizationFactor(metadata);

  logger.info(
    {
      totalBalances: balances.length,
      currentYearBalances: currentYear.length,
      balanceSheetAccounts: balanceSheet.length,
      incomeStatementAccounts: incomeStatement.length,
      openingBalanceAccounts: openingBalances.length,
      annualizationFactor: annFactor,
      daysInPeriod: days,
      isPartialYear: isPartial,
    },
    'Starting comprehensive KPI calculation'
  );

  // ============================================
  // BALANCE SHEET AGGREGATIONS
  // ============================================

  // Assets (Class 1xxx: positive amounts in SIE)
  const fixedAssets = sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.FIXED_ASSETS.ALL);
  const currentAssets = sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_ASSETS.ALL);
  const inventory = sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_ASSETS.INVENTORY);
  const customerReceivables = sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_ASSETS.CUSTOMER_RECEIVABLES);
  const cashAndBank = sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_ASSETS.CASH_AND_BANK);
  const totalAssets = fixedAssets + currentAssets;

  // Equity (Class 2080-2099: stored as negative in SIE, convert to positive)
  const totalEquity = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.EQUITY.ALL));

  // Untaxed reserves (2100-2199) - needs special treatment
  const untaxedReserves = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.UNTAXED_RESERVES.ALL));

  // YTD Result: Sum of all income statement accounts (3000-8999)
  // In SIE format, profit shows as negative sum of RES accounts, so we negate
  // This captures the current period's earnings that haven't been formally closed to equity yet
  const ytdResult = -sumAccountsInRange(incomeStatement, { min: 3000, max: 8999 });

  // Adjusted equity per Swedish accounting standards
  // Includes: Equity + 79.4% of untaxed reserves + YTD result
  const adjustedEquity = totalEquity + untaxedReserves * EQUITY_PORTION_OF_UNTAXED_RESERVES + ytdResult;
  const deferredTaxLiability = untaxedReserves * CORPORATE_TAX_RATE;

  // Provisions (2200-2299)
  const provisions = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.PROVISIONS.ALL));

  // Liabilities (Class 23xx-29xx: stored as negative in SIE, convert to positive)
  const longTermLiabilities = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.LONG_TERM_LIABILITIES.ALL));
  const currentLiabilities = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.ALL));

  // Total liabilities includes provisions and deferred tax
  const totalLiabilities = provisions + longTermLiabilities + currentLiabilities + deferredTaxLiability;

  // Interest-bearing debt (correct ranges per reference)
  const longTermDebt = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.LONG_TERM_LIABILITIES.INTEREST_BEARING)
  );
  const shortTermDebt = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.INTEREST_BEARING_SHORT)
  );
  const interestBearingDebt = longTermDebt + shortTermDebt;

  const netDebt = interestBearingDebt - cashAndBank;

  const accountsPayable = Math.abs(sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.ACCOUNTS_PAYABLE));

  // ============================================
  // INCOME STATEMENT AGGREGATIONS
  // ============================================

  // Revenue (Class 3xxx: stored as negative in RES, convert to positive)
  const grossSales = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.REVENUE.NET_SALES));
  const discounts = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.REVENUE.DISCOUNTS));
  const netSales = grossSales - discounts;
  const totalOperatingIncome = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.REVENUE.ALL));

  // Operating expenses (Class 4-7: stored as positive costs in SIE)
  const costOfGoodsSold = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.COST_OF_GOODS_SOLD.ALL);
  const externalCosts = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.OPERATING_EXPENSES.ALL);
  const personnelCosts = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.PERSONNEL_COSTS.WAGES);
  const writeDowns = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.PERSONNEL_COSTS.WRITE_DOWNS);
  const depreciation = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.PERSONNEL_COSTS.DEPRECIATION);
  const otherOperatingCosts = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.PERSONNEL_COSTS.OTHER);

  const grossProfit = netSales - costOfGoodsSold;
  const ebitda = totalOperatingIncome - costOfGoodsSold - externalCosts - personnelCosts;
  const ebit = ebitda - depreciation - writeDowns;

  // Financial items (correct ranges per reference)
  // Note: In Swedish SIE files, expenses on RES accounts are typically stored as negative values
  // We use Math.abs() to ensure consistent positive values for expense calculations
  const financialIncome = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.FINANCIAL_ITEMS.FINANCIAL_INCOME));
  const interestExpenses = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.FINANCIAL_ITEMS.INTEREST_EXPENSES));
  const otherFinancialExpenses = Math.abs(sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.FINANCIAL_ITEMS.OTHER_FINANCIAL_EXPENSES));
  const financialNet = financialIncome - interestExpenses - otherFinancialExpenses;

  const resultBeforeTax = ebit + financialNet;
  const tax = sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.FINANCIAL_ITEMS.TAXES);
  const netIncome = resultBeforeTax - tax;

  logger.info(
    {
      netSales,
      grossProfit,
      ebitda,
      ebit,
      resultBeforeTax,
      netIncome,
      totalAssets,
      totalEquity,
      ytdResult,
      adjustedEquity,
      totalLiabilities,
      interestBearingDebt,
    },
    'Balance sheet and income statement aggregated'
  );

  // ============================================
  // MARGIN KPIs
  // ============================================

  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : null;
  const ebitdaMargin = netSales > 0 ? (ebitda / netSales) * 100 : null;
  const operatingMargin = netSales > 0 ? (ebit / netSales) * 100 : null;
  const profitMargin = netSales > 0 ? (resultBeforeTax / netSales) * 100 : null;
  const netMargin = netSales > 0 ? (netIncome / netSales) * 100 : null;

  // ============================================
  // RETURN KPIs (using averages, annualized)
  // ============================================

  // Average values for return calculations
  const avgTotalAssets = calculateAverage(balances, { min: 1000, max: 1999 });
  const avgAdjustedEquity = calculateAdjustedEquityValue(balances, 'AVG');
  const avgInterestBearingDebt =
    Math.abs(calculateAverage(balances, SWEDISH_ACCOUNTS.LONG_TERM_LIABILITIES.INTEREST_BEARING)) +
    Math.abs(calculateAverage(balances, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.INTEREST_BEARING_SHORT));
  const avgCapitalEmployed = avgAdjustedEquity + avgInterestBearingDebt;

  // Annualize income statement items for return calculations
  const annualizedEbit = ebit * annFactor;
  const annualizedNetIncome = netIncome * annFactor;

  const roa = avgTotalAssets > 0 ? (annualizedEbit / avgTotalAssets) * 100 : null;
  const roe = avgAdjustedEquity > 0 ? (annualizedNetIncome / avgAdjustedEquity) * 100 : null;
  const roce = avgCapitalEmployed > 0 ? (annualizedEbit / avgCapitalEmployed) * 100 : null;

  // ============================================
  // CAPITAL STRUCTURE KPIs
  // ============================================

  const equityRatio = totalAssets > 0 ? (adjustedEquity / totalAssets) * 100 : null;
  const debtToEquityRatio = adjustedEquity > 0 ? totalLiabilities / adjustedEquity : null;
  const deRatio = adjustedEquity > 0 ? interestBearingDebt / adjustedEquity : null;

  // Annualize EBITDA for debt coverage ratios
  const annualizedEbitda = ebitda * annFactor;
  const netDebtToEbitda = annualizedEbitda > 0 ? netDebt / annualizedEbitda : null;

  // Interest coverage uses annualized values
  const annualizedInterestExpenses = interestExpenses * annFactor;
  const interestCoverageRatio =
    annualizedInterestExpenses > 0 ? annualizedEbitda / annualizedInterestExpenses : null;

  // ============================================
  // LIQUIDITY KPIs
  // ============================================

  const cashRatio = currentLiabilities > 0 ? cashAndBank / currentLiabilities : null;
  const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : null;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
  const workingCapital = currentAssets - currentLiabilities;
  const annualizedNetSales = netSales * annFactor;
  const workingCapitalRatio = annualizedNetSales > 0 ? (workingCapital / annualizedNetSales) * 100 : null;

  // ============================================
  // EFFICIENCY KPIs (annualized)
  // ============================================

  const annualizedCogs = costOfGoodsSold * annFactor;

  const avgInventory = calculateAverage(balances, SWEDISH_ACCOUNTS.CURRENT_ASSETS.INVENTORY);
  const avgReceivables = calculateAverage(balances, SWEDISH_ACCOUNTS.CURRENT_ASSETS.CUSTOMER_RECEIVABLES);
  const avgPayables = Math.abs(calculateAverage(balances, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.ACCOUNTS_PAYABLE));

  const dio = annualizedCogs > 0 ? (avgInventory / annualizedCogs) * 365 : null;
  const dso = annualizedNetSales > 0 ? (avgReceivables / annualizedNetSales) * 365 : null;
  const dpo = annualizedCogs > 0 ? (avgPayables / annualizedCogs) * 365 : null;
  const ccc = dio !== null && dso !== null && dpo !== null ? dio + dso - dpo : null;
  const assetTurnover = totalAssets > 0 ? annualizedNetSales / totalAssets : null;

  // ============================================
  // GROWTH KPIs (year-over-year)
  // ============================================

  // Previous year values
  const prevYearRevenue = Math.abs(
    sumAccountsInRange(
      balances.filter((b) => b.balanceType === 'RES' && b.yearIndex === -1),
      SWEDISH_ACCOUNTS.REVENUE.ALL
    )
  );
  const prevYearAssets = sumAccountsInRange(
    balances.filter((b) => b.balanceType === 'UB' && b.yearIndex === -1),
    { min: 1000, max: 1999 }
  );
  const prevYearAdjustedEquity = calculateAdjustedEquityValue(balances, 'UB', -1);

  const revenueGrowth =
    prevYearRevenue > 0 ? ((totalOperatingIncome - prevYearRevenue) / prevYearRevenue) * 100 : null;
  const assetGrowth = prevYearAssets > 0 ? ((totalAssets - prevYearAssets) / prevYearAssets) * 100 : null;
  const equityGrowth =
    prevYearAdjustedEquity > 0
      ? ((adjustedEquity - prevYearAdjustedEquity) / prevYearAdjustedEquity) * 100
      : null;

  logger.info(
    {
      margins: { grossMargin, ebitdaMargin, operatingMargin, profitMargin, netMargin },
      returns: { roa, roe, roce },
      capitalStructure: { equityRatio, debtToEquityRatio, deRatio, netDebtToEbitda, interestCoverageRatio },
      liquidity: { cashRatio, quickRatio, currentRatio, workingCapital },
      efficiency: { dio, dso, dpo, ccc, assetTurnover },
      growth: { revenueGrowth, assetGrowth, equityGrowth },
    },
    'KPI calculation completed'
  );

  return {
    // Balance sheet items
    totalAssets,
    fixedAssets,
    currentAssets,
    inventory,
    customerReceivables,
    cashAndBank,
    totalEquity,
    untaxedReserves,
    adjustedEquity,
    deferredTaxLiability,
    provisions,
    longTermLiabilities,
    currentLiabilities,
    totalLiabilities,
    interestBearingDebt,
    netDebt,
    accountsPayable,

    // Income statement items
    netSales,
    totalOperatingIncome,
    costOfGoodsSold,
    grossProfit,
    externalCosts,
    personnelCosts,
    writeDowns,
    depreciation,
    ebitda,
    ebit,
    financialIncome,
    interestExpenses,
    financialNet,
    resultBeforeTax,
    tax,
    netIncome,

    // Margin KPIs
    grossMargin,
    ebitdaMargin,
    operatingMargin,
    profitMargin,
    netMargin,

    // Return KPIs
    roa,
    roe,
    roce,

    // Capital structure KPIs
    equityRatio,
    debtToEquityRatio,
    deRatio,
    netDebtToEbitda,
    interestCoverageRatio,

    // Liquidity KPIs
    cashRatio,
    quickRatio,
    currentRatio,
    workingCapital,
    workingCapitalRatio,

    // Efficiency KPIs
    dio,
    dso,
    dpo,
    ccc,
    assetTurnover,

    // Growth KPIs
    revenueGrowth,
    assetGrowth,
    equityGrowth,

    // Metadata
    annualizationFactor: annFactor,
    daysInPeriod: days,
    isPartialYear: isPartial,
  };
}

/**
 * Validate that required balance types are present
 */
export function validateSIEBalances(balances: SIEBalance[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const currentYear = balances.filter((b) => b.yearIndex === 0);
  if (currentYear.length === 0) {
    errors.push('No current year balances found (year_index = 0)');
  }

  const balanceSheet = currentYear.filter((b) => b.balanceType === 'UB');
  if (balanceSheet.length === 0) {
    errors.push('No closing balances found (balance_type = UB)');
  }

  const incomeStatement = currentYear.filter((b) => b.balanceType === 'RES');
  if (incomeStatement.length === 0) {
    errors.push('No result accounts found (balance_type = RES)');
  }

  const openingBalances = currentYear.filter((b) => b.balanceType === 'IB');
  if (openingBalances.length === 0) {
    warnings.push('No opening balances found (balance_type = IB) - averages will use UB only');
  }

  const previousYear = balances.filter((b) => b.yearIndex === -1);
  if (previousYear.length === 0) {
    warnings.push('No previous year data found (year_index = -1) - growth metrics unavailable');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format KPIs for database insertion (extended version)
 * Returns array of values in the correct order for INSERT statement
 */
export function formatKPIsForDB(kpis: CalculatedKPIs): Array<number | null | boolean> {
  return [
    // Balance sheet items
    kpis.totalAssets,
    kpis.fixedAssets,
    kpis.currentAssets,
    kpis.inventory,
    kpis.customerReceivables,
    kpis.cashAndBank,
    kpis.totalEquity,
    kpis.untaxedReserves,
    kpis.adjustedEquity,
    kpis.deferredTaxLiability,
    kpis.provisions,
    kpis.longTermLiabilities,
    kpis.currentLiabilities,
    kpis.totalLiabilities,
    kpis.interestBearingDebt,
    kpis.netDebt,
    kpis.accountsPayable,

    // Income statement items
    kpis.netSales,
    kpis.totalOperatingIncome,
    kpis.costOfGoodsSold,
    kpis.grossProfit,
    kpis.externalCosts,
    kpis.personnelCosts,
    kpis.writeDowns,
    kpis.depreciation,
    kpis.ebitda,
    kpis.ebit,
    kpis.financialIncome,
    kpis.interestExpenses,
    kpis.financialNet,
    kpis.resultBeforeTax,
    kpis.tax,
    kpis.netIncome,

    // Margin KPIs
    kpis.grossMargin,
    kpis.ebitdaMargin,
    kpis.operatingMargin,
    kpis.profitMargin,
    kpis.netMargin,

    // Return KPIs
    kpis.roa,
    kpis.roe,
    kpis.roce,

    // Capital structure KPIs
    kpis.equityRatio,
    kpis.debtToEquityRatio,
    kpis.deRatio,
    kpis.netDebtToEbitda,
    kpis.interestCoverageRatio,

    // Liquidity KPIs
    kpis.cashRatio,
    kpis.quickRatio,
    kpis.currentRatio,
    kpis.workingCapital,
    kpis.workingCapitalRatio,

    // Efficiency KPIs
    kpis.dio,
    kpis.dso,
    kpis.dpo,
    kpis.ccc,
    kpis.assetTurnover,

    // Growth KPIs
    kpis.revenueGrowth,
    kpis.assetGrowth,
    kpis.equityGrowth,

    // Metadata
    kpis.annualizationFactor,
    kpis.daysInPeriod,
    kpis.isPartialYear,
  ];
}

/**
 * Convert new KPI format to legacy format for backward compatibility
 */
export function toLegacyKPIs(kpis: CalculatedKPIs): LegacyCalculatedKPIs {
  return {
    ebitda: kpis.ebitda !== 0 ? kpis.ebitda : null,
    interestCoverageRatio: kpis.interestCoverageRatio,
    debtToEquityRatio: kpis.debtToEquityRatio,
    netDebtToEbitda: kpis.netDebtToEbitda,
    equityRatio: kpis.equityRatio,
    quickRatio: kpis.quickRatio,
    workingCapital: kpis.workingCapital !== 0 ? kpis.workingCapital : null,
    operatingProfit: kpis.ebit,
    depreciation: kpis.depreciation,
    interestExpenses: kpis.interestExpenses,
    totalAssets: kpis.totalAssets,
    totalEquity: kpis.adjustedEquity, // Use adjusted equity for backward compatibility
    totalLiabilities: kpis.totalLiabilities,
    currentAssets: kpis.currentAssets,
    currentLiabilities: kpis.currentLiabilities,
    inventory: kpis.inventory,
    cashAndBank: kpis.cashAndBank,
    interestBearingDebt: kpis.interestBearingDebt,
  };
}
