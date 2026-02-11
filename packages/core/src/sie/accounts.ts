/**
 * Swedish BAS (Baskontoplan) Account Range Mappings
 *
 * Provides constants and utilities for working with Swedish
 * accounting standards (BAS 2024 K2/K3). Used for classifying and aggregating
 * SIE (Standard Import Export) account data.
 *
 * Account Structure:
 * - Class 1: Assets (Tillgångar)
 * - Class 2: Equity & Liabilities (Eget kapital och skulder)
 * - Class 3: Revenue (Intäkter)
 * - Class 4: Cost of Goods Sold (Kostnader för sålda varor)
 * - Classes 5-7: Operating Expenses (Rörelsekostnader)
 * - Class 8: Financial Items (Finansiella poster)
 *
 * Ported from arcim's lib/swedish-account-ranges.ts
 */

export interface AccountRange {
  min: number;
  max: number;
}

/**
 * Swedish BAS Account Plan - Account Number Ranges
 *
 * Sign conventions in SIE files:
 * - Assets (1xxx): Positive values
 * - Liabilities, Equity (2xxx): Negative values (convert with Math.abs)
 * - Revenue (3xxx): Negative values (convert with Math.abs)
 * - Expenses (4xxx-8xxx): Positive values
 */
export const SWEDISH_ACCOUNTS = {
  // ===== BALANCE SHEET - ASSETS (Class 1) =====

  FIXED_ASSETS: {
    ALL: { min: 1000, max: 1399 } as AccountRange,
    INTANGIBLE: { min: 1000, max: 1099 } as AccountRange,
    BUILDINGS_AND_LAND: { min: 1100, max: 1199 } as AccountRange,
    MACHINERY_AND_EQUIPMENT: { min: 1200, max: 1299 } as AccountRange,
    FINANCIAL: { min: 1300, max: 1399 } as AccountRange,
  },

  CURRENT_ASSETS: {
    ALL: { min: 1400, max: 1999 } as AccountRange,
    INVENTORY: { min: 1400, max: 1499 } as AccountRange,
    CUSTOMER_RECEIVABLES: { min: 1500, max: 1599 } as AccountRange,
    OTHER_RECEIVABLES: { min: 1600, max: 1699 } as AccountRange,
    PREPAID_EXPENSES: { min: 1700, max: 1799 } as AccountRange,
    SHORT_TERM_INVESTMENTS: { min: 1800, max: 1899 } as AccountRange,
    CASH_AND_BANK: { min: 1900, max: 1999 } as AccountRange,
  },

  // ===== BALANCE SHEET - EQUITY AND LIABILITIES (Class 2) =====

  EQUITY: {
    ALL: { min: 2080, max: 2099 } as AccountRange,
    SHARE_CAPITAL: { min: 2081, max: 2089 } as AccountRange,
    RETAINED_EARNINGS: { min: 2091, max: 2098 } as AccountRange,
    NET_INCOME: { min: 2099, max: 2099 } as AccountRange,
  },

  UNTAXED_RESERVES: {
    ALL: { min: 2100, max: 2199 } as AccountRange,
    // Split: 79.4% → Equity portion, 20.6% → Deferred tax liability
  },

  PROVISIONS: {
    ALL: { min: 2200, max: 2299 } as AccountRange,
  },

  LONG_TERM_LIABILITIES: {
    ALL: { min: 2300, max: 2399 } as AccountRange,
    INTEREST_BEARING: { min: 2310, max: 2359 } as AccountRange,
    NON_INTEREST_BEARING: { min: 2360, max: 2399 } as AccountRange,
  },

  CURRENT_LIABILITIES: {
    ALL: { min: 2400, max: 2999 } as AccountRange,
    ACCOUNTS_PAYABLE: { min: 2400, max: 2499 } as AccountRange,
    TAX_LIABILITIES: { min: 2500, max: 2699 } as AccountRange,
    PERSONNEL_LIABILITIES: { min: 2700, max: 2799 } as AccountRange,
    OTHER_CURRENT: { min: 2800, max: 2899 } as AccountRange,
    INTEREST_BEARING_SHORT: { min: 2840, max: 2849 } as AccountRange,
    ACCRUED_EXPENSES: { min: 2900, max: 2999 } as AccountRange,
  },

  // ===== INCOME STATEMENT - REVENUE (Class 3) =====

  REVENUE: {
    ALL: { min: 3000, max: 3999 } as AccountRange,
    NET_SALES: { min: 3000, max: 3699 } as AccountRange,
    DISCOUNTS: { min: 3700, max: 3799 } as AccountRange,
    CAPITALIZED_WORK: { min: 3800, max: 3899 } as AccountRange,
    OTHER_OPERATING_INCOME: { min: 3900, max: 3999 } as AccountRange,
  },

  // ===== INCOME STATEMENT - COSTS (Class 4-7) =====

  COST_OF_GOODS_SOLD: {
    ALL: { min: 4000, max: 4999 } as AccountRange,
    MATERIALS: { min: 4000, max: 4499 } as AccountRange,
    GOODS_FOR_RESALE: { min: 4500, max: 4999 } as AccountRange,
  },

  OPERATING_EXPENSES: {
    ALL: { min: 5000, max: 6999 } as AccountRange,
    PREMISES: { min: 5000, max: 5099 } as AccountRange,
    SALES_EXPENSES: { min: 5100, max: 5999 } as AccountRange,
    OTHER_EXTERNAL: { min: 6000, max: 6999 } as AccountRange,
  },

  PERSONNEL_COSTS: {
    ALL: { min: 7000, max: 7999 } as AccountRange,
    WAGES: { min: 7000, max: 7699 } as AccountRange,
    WRITE_DOWNS: { min: 7700, max: 7799 } as AccountRange,
    DEPRECIATION: { min: 7800, max: 7899 } as AccountRange,
    OTHER: { min: 7900, max: 7999 } as AccountRange,
  },

  // ===== INCOME STATEMENT - FINANCIAL ITEMS (Class 8) =====

  FINANCIAL_ITEMS: {
    ALL: { min: 8000, max: 8999 } as AccountRange,
    FINANCIAL_INCOME: { min: 8000, max: 8299 } as AccountRange,
    OTHER_FINANCIAL_EXPENSES: { min: 8300, max: 8399 } as AccountRange,
    INTEREST_EXPENSES: { min: 8400, max: 8499 } as AccountRange,
    APPROPRIATIONS: { min: 8800, max: 8899 } as AccountRange,
    TAXES: { min: 8900, max: 8999 } as AccountRange,
  },
} as const;

/**
 * Tax rate for splitting untaxed reserves (bolagsskatt 2024)
 */
export const CORPORATE_TAX_RATE = 0.206; // 20.6%
export const EQUITY_PORTION_OF_UNTAXED_RESERVES = 1 - CORPORATE_TAX_RATE; // 79.4%

/**
 * Check if an account number falls within a specified range.
 * Accepts either an AccountRange object or explicit min/max numbers.
 */
export function isInRange(
  accountNumber: string | number,
  rangeOrMin: AccountRange | number,
  max?: number,
): boolean {
  const num =
    typeof accountNumber === 'string'
      ? parseInt(accountNumber, 10)
      : accountNumber;
  if (isNaN(num)) return false;

  if (typeof rangeOrMin === 'number') {
    return num >= rangeOrMin && num <= (max ?? rangeOrMin);
  }

  return num >= rangeOrMin.min && num <= rangeOrMin.max;
}

/**
 * Sum amounts for all accounts within a specified range.
 */
export function sumAccountsInRange(
  balances: Array<{ accountNumber: string; amount: number }>,
  range: AccountRange,
): number {
  return balances
    .filter((b) => isInRange(b.accountNumber, range))
    .reduce((sum, b) => sum + b.amount, 0);
}

/**
 * Classify an account number into its BAS category label.
 */
export function classifyAccount(
  accountNumber: string | number,
): string | null {
  const num =
    typeof accountNumber === 'string'
      ? parseInt(accountNumber, 10)
      : accountNumber;
  if (isNaN(num)) return null;

  // Balance Sheet - Assets
  if (num >= 1000 && num <= 1099) return 'Immateriella anläggningstillgångar';
  if (num >= 1100 && num <= 1199) return 'Byggnader och mark';
  if (num >= 1200 && num <= 1299) return 'Maskiner och inventarier';
  if (num >= 1300 && num <= 1399) return 'Finansiella anläggningstillgångar';
  if (num >= 1400 && num <= 1499) return 'Varulager';
  if (num >= 1500 && num <= 1599) return 'Kundfordringar';
  if (num >= 1600 && num <= 1699) return 'Övriga fordringar';
  if (num >= 1700 && num <= 1799) return 'Förutbetalda kostnader';
  if (num >= 1800 && num <= 1899) return 'Kortfristiga placeringar';
  if (num >= 1900 && num <= 1999) return 'Kassa och bank';

  // Balance Sheet - Equity and Liabilities
  if (num >= 2080 && num <= 2099) return 'Eget kapital';
  if (num >= 2100 && num <= 2199) return 'Obeskattade reserver';
  if (num >= 2200 && num <= 2299) return 'Avsättningar';
  if (num >= 2300 && num <= 2399) return 'Långfristiga skulder';
  if (num >= 2400 && num <= 2499) return 'Leverantörsskulder';
  if (num >= 2500 && num <= 2699) return 'Skatteskulder';
  if (num >= 2700 && num <= 2799) return 'Personalens skatter och avgifter';
  if (num >= 2800 && num <= 2899) return 'Övriga kortfristiga skulder';
  if (num >= 2900 && num <= 2999) return 'Upplupna kostnader';

  // Income Statement
  if (num >= 3000 && num <= 3699) return 'Nettoomsättning';
  if (num >= 3700 && num <= 3799) return 'Rabatter och avdrag';
  if (num >= 3800 && num <= 3899) return 'Aktiverat arbete';
  if (num >= 3900 && num <= 3999) return 'Övriga rörelseintäkter';
  if (num >= 4000 && num <= 4999) return 'Kostnader för sålda varor';
  if (num >= 5000 && num <= 5099) return 'Lokalkostnader';
  if (num >= 5100 && num <= 5999) return 'Försäljningskostnader';
  if (num >= 6000 && num <= 6999) return 'Övriga externa kostnader';
  if (num >= 7000 && num <= 7699) return 'Personalkostnader';
  if (num >= 7700 && num <= 7799) return 'Nedskrivningar';
  if (num >= 7800 && num <= 7899) return 'Avskrivningar';
  if (num >= 7900 && num <= 7999) return 'Övriga rörelsekostnader';
  if (num >= 8000 && num <= 8299) return 'Finansiella intäkter';
  if (num >= 8300 && num <= 8399) return 'Övriga finansiella kostnader';
  if (num >= 8400 && num <= 8499) return 'Räntekostnader';
  if (num >= 8800 && num <= 8899) return 'Bokslutsdispositioner';
  if (num >= 8900 && num <= 8999) return 'Skatter';

  return null;
}

/**
 * Check if an account is balance sheet or income statement.
 */
export function getAccountType(
  accountNumber: string,
): 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'UNKNOWN' {
  const num = parseInt(accountNumber, 10);
  if (isNaN(num)) return 'UNKNOWN';
  if (num >= 1000 && num <= 2999) return 'BALANCE_SHEET';
  if (num >= 3000 && num <= 8999) return 'INCOME_STATEMENT';
  return 'UNKNOWN';
}

/**
 * Get all accounts from a parsed SIE within a range.
 * Accepts objects with either `accountNumber` (SIEAccount) or `number` key.
 */
export function getAccountsInRange<
  T extends { accountNumber: string } | { number: string },
>(accounts: T[], from: number, to: number): T[] {
  return accounts.filter((a) => {
    const num = 'accountNumber' in a ? a.accountNumber : a.number;
    return isInRange(num, from, to);
  });
}

/**
 * Calculate adjusted equity (Justerat eget kapital) per Swedish accounting standards.
 * Includes equity + 79.4% of untaxed reserves.
 */
export function calculateAdjustedEquity(
  balanceSheet: Array<{ accountNumber: string; amount: number }>,
): number {
  const equity = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.EQUITY.ALL),
  );
  const untaxedReserves = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.UNTAXED_RESERVES.ALL),
  );
  return equity + untaxedReserves * EQUITY_PORTION_OF_UNTAXED_RESERVES;
}

/**
 * Calculate total liabilities including latent tax from untaxed reserves.
 */
export function calculateTotalLiabilities(
  balanceSheet: Array<{ accountNumber: string; amount: number }>,
): number {
  const provisions = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.PROVISIONS.ALL),
  );
  const longTermLiabilities = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.LONG_TERM_LIABILITIES.ALL),
  );
  const currentLiabilities = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.ALL),
  );
  const untaxedReserves = Math.abs(
    sumAccountsInRange(balanceSheet, SWEDISH_ACCOUNTS.UNTAXED_RESERVES.ALL),
  );
  const latentTaxLiability = untaxedReserves * CORPORATE_TAX_RATE;

  return provisions + longTermLiabilities + currentLiabilities + latentTaxLiability;
}

/**
 * Calculate interest-bearing debt (2310-2359 + 2840-2849).
 */
export function calculateInterestBearingDebt(
  balanceSheet: Array<{ accountNumber: string; amount: number }>,
): number {
  const longTermDebt = Math.abs(
    sumAccountsInRange(
      balanceSheet,
      SWEDISH_ACCOUNTS.LONG_TERM_LIABILITIES.INTEREST_BEARING,
    ),
  );
  const shortTermDebt = Math.abs(
    sumAccountsInRange(
      balanceSheet,
      SWEDISH_ACCOUNTS.CURRENT_LIABILITIES.INTEREST_BEARING_SHORT,
    ),
  );
  return longTermDebt + shortTermDebt;
}

/**
 * Calculate net sales = Gross sales (3000-3699) - Discounts (3700-3799).
 */
export function calculateNetSales(
  incomeStatement: Array<{ accountNumber: string; amount: number }>,
): number {
  const grossSales = Math.abs(
    sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.REVENUE.NET_SALES),
  );
  const discounts = Math.abs(
    sumAccountsInRange(incomeStatement, SWEDISH_ACCOUNTS.REVENUE.DISCOUNTS),
  );
  return grossSales - discounts;
}
