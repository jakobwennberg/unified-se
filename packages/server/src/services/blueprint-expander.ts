/**
 * Deterministic blueprint expander.
 *
 * Takes an AI-generated "financial blueprint" (structured JSON) and expands
 * it into a full SIEParseResult with individual transactions, balanced
 * verifications, and correct opening/closing/result balances.
 *
 * No LLM calls — this is pure TypeScript math.
 *
 * Phase 1: Type-aware dating, multiple tx/month, seasonal multipliers, varied descriptions
 * Phase 2: VAT on transactions, multi-leg salary, quarterly VAT settlement
 * Phase 3: Bokslut entries, verification series by type, post-generation validation
 */
import type {
  SIEParseResult,
  SIEMetadata,
  SIEAccount,
  SIEBalance,
  SIETransaction,
  GenerateCompanyRequest,
  CompanyIndustry,
} from '@arcim-sync/core';
import { getAccountType } from '@arcim-sync/core/sie';
import { INDUSTRY_RULES } from './industry-rules.js';

// ---- Blueprint types (output from AI) ----

export interface CompanyBlueprint {
  profile: {
    companyName: string;
    orgNumber: string;
    industry: string;
    size: string;
    description: string;
  };
  accounts: BlueprintAccount[];
  openingBalances: BlueprintBalance[];
  transactionTemplates: BlueprintTransactionTemplate[];
  annualFinancials: {
    totalRevenue: number;
    totalCOGS: number;
    totalOperatingExpenses: number;
    totalPersonnelCosts: number;
    totalFinancialItems: number;
    taxAmount: number;
  };
  previousYearMultiplier?: number;
}

export interface BlueprintAccount {
  number: string;
  name: string;
}

export interface BlueprintBalance {
  accountNumber: string;
  amount: number;
}

export interface BlueprintTransactionTemplate {
  description: string;
  debitAccount: string;
  creditAccount: string;
  /** Monthly base amount (positive) */
  monthlyAmount: number;
  /** Random variance as fraction, e.g. 0.1 = ±10% */
  variance: number;
  /** Which months to generate (1-12). Defaults to all 12. */
  months?: number[];
  /** How many transactions per month. Default 1. Revenue might be 5-15. */
  monthlyCount?: number;
  /** Date pattern for transaction timing. */
  datePattern?: 'first' | 'mid' | 'salary' | 'tax' | 'spread' | 'end';
  /** VAT rate (0, 6, 12, 25). 0 means no VAT lines. */
  vatRate?: number;
  /** Description pattern with {month}, {n} placeholders for variety. */
  descriptionPattern?: string;
}

// ---- Verification series by transaction type ----

type VerSeries = 'A' | 'B' | 'C' | 'E' | 'D' | 'YE';

/** Determine verification series from template accounts. */
function getVerificationSeries(template: BlueprintTransactionTemplate): VerSeries {
  const debit = parseInt(template.debitAccount, 10);
  const credit = parseInt(template.creditAccount, 10);

  // Salary: debit is 7xxx personnel cost
  if (debit >= 7000 && debit < 7900 && debit !== 7830) return 'E';
  // Revenue: credit is 3xxx
  if (credit >= 3000 && credit < 4000) return 'B';
  // Supplier/expense: debit is 4xxx-6xxx (expense accounts)
  if (debit >= 4000 && debit < 7000) return 'A';
  // Depreciation (7830)
  if (debit === 7830) return 'A';
  // Tax (8910)
  if (debit >= 8000 && debit < 9000) return 'A';
  // Default: bank transaction
  return 'C';
}

// ---- Account group mapping ----

const ACCOUNT_GROUPS: Record<string, string> = {
  '1': '1 - Tillgångar',
  '2': '2 - Eget kapital och skulder',
  '3': '3 - Rörelsens inkomster och intäkter',
  '4': '4 - Utgifter och kostnader förädling',
  '5': '5 - Övriga externa rörelseutgifter och kostnader',
  '6': '6 - Övriga externa rörelseutgifter och kostnader',
  '7': '7 - Utgifter och kostnader för personal',
  '8': '8 - Finansiella och andra inkomster/utgifter',
};

// ---- Swedish month names ----

const MONTH_NAMES = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

// ---- VAT accounts ----

const VAT_OUTPUT_ACCOUNTS: Record<number, string> = {
  25: '2611',
  12: '2621',
  6: '2631',
};

const VAT_INPUT_ACCOUNT = '1650';

// ---- Helpers ----

/** Deterministic seeded random for reproducibility. Simple LCG. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** Apply variance to a base amount. */
function varyAmount(base: number, variance: number, rand: () => number): number {
  const factor = 1 + (rand() * 2 - 1) * variance;
  return Math.round(base * factor * 100) / 100;
}

/** Format a date as YYYY-MM-DD. */
function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Get the last day of a month. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Get the day of week (0=Sun, 6=Sat). */
function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

/** Shift a day to avoid weekends. If Sat→Fri, if Sun→Mon. */
function avoidWeekend(year: number, month: number, day: number): number {
  const maxDay = lastDayOfMonth(year, month);
  day = Math.min(day, maxDay);
  const dow = dayOfWeek(year, month, day);
  if (dow === 0) return Math.min(day + 1, maxDay); // Sun → Mon
  if (dow === 6) return Math.max(day - 1, 1);       // Sat → Fri
  return day;
}

/** Get transaction date based on date pattern. */
function getTransactionDate(
  year: number,
  month: number,
  pattern: BlueprintTransactionTemplate['datePattern'],
  rand: () => number,
  index?: number,
  count?: number,
): string {
  const maxDay = lastDayOfMonth(year, month);
  let day: number;

  switch (pattern) {
    case 'first':
      day = avoidWeekend(year, month, 1);
      break;
    case 'salary':
      day = avoidWeekend(year, month, 25);
      break;
    case 'tax':
      day = avoidWeekend(year, month, 12);
      break;
    case 'end':
      day = avoidWeekend(year, month, Math.min(28 + Math.floor(rand() * 3), maxDay));
      break;
    case 'spread': {
      // Spread transactions evenly across the month with some jitter
      if (count && count > 1 && index != null) {
        const spacing = Math.max(1, Math.floor(25 / count));
        const baseDay = 2 + index * spacing + Math.floor(rand() * Math.max(1, spacing - 1));
        day = avoidWeekend(year, month, Math.min(baseDay, maxDay));
      } else {
        day = avoidWeekend(year, month, 1 + Math.floor(rand() * 27));
      }
      break;
    }
    case 'mid':
    default:
      day = avoidWeekend(year, month, 10 + Math.floor(rand() * 15));
      break;
  }

  return formatDate(year, month, day);
}

/** Generate a varied description from a pattern or base description. */
function generateDescription(
  template: BlueprintTransactionTemplate,
  month: number,
  index: number,
  verNumber: number,
): string {
  if (template.descriptionPattern) {
    return template.descriptionPattern
      .replace('{month}', MONTH_NAMES[month - 1]!)
      .replace('{n}', String(index + 1))
      .replace('{ver}', String(1000 + verNumber));
  }

  // Auto-generate variety based on account types
  const debit = parseInt(template.debitAccount, 10);
  const credit = parseInt(template.creditAccount, 10);
  const monthName = MONTH_NAMES[month - 1]!;

  // Revenue
  if (credit >= 3000 && credit < 4000) {
    const variants = [
      `Försäljning ${monthName}`,
      `Kundbetalning fakt ${1000 + verNumber}`,
      `Försäljning faktura ${1000 + verNumber}`,
      `Intäkt ${monthName}`,
    ];
    return variants[index % variants.length]!;
  }

  // COGS
  if (debit >= 4000 && debit < 5000) {
    const variants = [
      `Leverantörsfaktura ${monthName}`,
      `Inköp material`,
      `Varuinköp fakt ${2000 + verNumber}`,
      `Leverantörsbetalning`,
    ];
    return variants[index % variants.length]!;
  }

  // Salary
  if (debit >= 7200 && debit < 7300) {
    return `Löneutbetalning ${monthName}`;
  }

  // Social security
  if (debit >= 7500 && debit < 7600) {
    return `Arbetsgivaravgifter ${monthName}`;
  }

  // Pension
  if (debit >= 7400 && debit < 7500) {
    return `Tjänstepension ${monthName}`;
  }

  // Rent
  if (debit >= 5010 && debit <= 5010) {
    return `Månadshyra ${monthName}`;
  }

  // Depreciation
  if (debit === 7830) {
    return `Avskrivning ${monthName}`;
  }

  // Tax
  if (debit === 8910) {
    return `Preliminärskatt ${monthName}`;
  }

  // Other expenses
  if (debit >= 5000 && debit < 7000) {
    const variants = [
      template.description,
      `${template.description} ${monthName}`,
    ];
    return variants[month % variants.length]!;
  }

  return template.description;
}

/** Infer date pattern from template accounts if not explicitly set. */
function inferDatePattern(template: BlueprintTransactionTemplate): NonNullable<BlueprintTransactionTemplate['datePattern']> {
  if (template.datePattern) return template.datePattern;

  const debit = parseInt(template.debitAccount, 10);

  // Rent, subscriptions → first of month
  if (debit === 5010 || debit === 6310 || debit === 6250) return 'first';
  // Salary → 25th
  if (debit >= 7200 && debit < 7600) return 'salary';
  // Tax → 12th
  if (debit === 8910) return 'tax';
  // Revenue → spread across month
  if (parseInt(template.creditAccount, 10) >= 3000 && parseInt(template.creditAccount, 10) < 4000) return 'spread';
  // COGS → spread
  if (debit >= 4000 && debit < 5000) return 'spread';
  // Depreciation → end of month
  if (debit === 7830) return 'end';
  // Default: mid-month
  return 'mid';
}

/** Infer monthly count from template if not explicitly set. */
function inferMonthlyCount(template: BlueprintTransactionTemplate): number {
  if (template.monthlyCount && template.monthlyCount > 0) return template.monthlyCount;

  const debit = parseInt(template.debitAccount, 10);
  const credit = parseInt(template.creditAccount, 10);

  // Revenue → multiple sales per month
  if (credit >= 3000 && credit < 4000) return 5 + Math.floor(template.monthlyAmount / 50000);
  // COGS → several purchases per month
  if (debit >= 4000 && debit < 5000) return 3 + Math.floor(template.monthlyAmount / 80000);
  // Everything else → 1 per month
  return 1;
}

// ---- Current ratio normalization ----

/** Accounts to add when current liabilities are too low. */
const MISSING_LIABILITY_ACCOUNTS: {
  account: string;
  name: string;
  /** Compute the ideal amount from annual financials. */
  compute: (fin: CompanyBlueprint['annualFinancials']) => number;
}[] = [
  {
    account: '2640',
    name: 'Utgående moms',
    // ~1 month of net output VAT (assuming 25% VAT rate)
    compute: (fin) => Math.round((fin.totalRevenue / 12) * 0.25 / 1.25),
  },
  {
    account: '2710',
    name: 'Personalens källskatt',
    // ~30% of one month's gross salary (personnel / 1.4 ≈ gross salary)
    compute: (fin) => Math.round((fin.totalPersonnelCosts / 1.4 / 12) * 0.30),
  },
  {
    account: '2730',
    name: 'Lagstadgade sociala avgifter',
    // ~31.42% of one month's gross salary
    compute: (fin) => Math.round((fin.totalPersonnelCosts / 1.4 / 12) * 0.3142),
  },
  {
    account: '2920',
    name: 'Upplupna semesterlöner',
    // ~12% of annual gross salary
    compute: (fin) => Math.round((fin.totalPersonnelCosts / 1.4) * 0.12),
  },
  {
    account: '2510',
    name: 'Skatteskulder',
    // ~2 months of corporate tax
    compute: (fin) => Math.round(fin.taxAmount / 6),
  },
];

/**
 * Ensure the current ratio (current assets / current liabilities) is realistic.
 * If too high (> MAX_RATIO), adds missing current liability accounts and
 * transfers the amount from retained earnings (2091) to keep the balance sheet balanced.
 */
function normalizeCurrentRatio(
  blueprint: CompanyBlueprint,
  ibMap: Map<string, number>,
  accounts: SIEAccount[],
): void {
  const MAX_RATIO = 3.0;
  const TARGET_RATIO = 1.8;

  // Sum current assets (1400-1999) and current liabilities (2400-2999)
  let currentAssets = 0;
  let currentLiabilities = 0;
  for (const [accNum, amount] of ibMap) {
    const num = parseInt(accNum, 10);
    if (num >= 1400 && num <= 1999) currentAssets += amount; // positive
    if (num >= 2400 && num <= 2999) currentLiabilities += Math.abs(amount); // stored negative
  }

  if (currentLiabilities <= 0 || currentAssets / currentLiabilities <= MAX_RATIO) {
    return; // ratio is already acceptable
  }

  const targetCL = currentAssets / TARGET_RATIO;
  const deficit = targetCL - currentLiabilities;

  // Build list of liabilities to add (only for accounts not already present or with trivial amounts)
  const additions: { account: string; name: string; amount: number }[] = [];
  let totalAdded = 0;

  for (const spec of MISSING_LIABILITY_ACCOUNTS) {
    const existing = ibMap.get(spec.account) ?? 0;
    // Skip if account already has a meaningful negative balance (> 1000 SEK)
    if (Math.abs(existing) > 1000) continue;

    const idealAmount = spec.compute(blueprint.annualFinancials);
    if (idealAmount <= 0) continue;

    additions.push({ account: spec.account, name: spec.name, amount: idealAmount });
    totalAdded += idealAmount;
  }

  if (totalAdded === 0) return;

  // Scale if we overshoot or undershoot the deficit
  const scale = Math.min(deficit / totalAdded, 1.5);
  let finalTotal = 0;

  for (const entry of additions) {
    const scaled = Math.round(entry.amount * scale);
    if (scaled <= 0) continue;

    // Add/update liability in ibMap (negative for liabilities)
    const existing = ibMap.get(entry.account) ?? 0;
    ibMap.set(entry.account, existing - scaled);
    finalTotal += scaled;

    // Ensure account exists in accounts list
    if (!accounts.some((a) => a.accountNumber === entry.account)) {
      accounts.push({
        accountNumber: entry.account,
        accountName: entry.name,
        accountGroup: ACCOUNT_GROUPS['2'] ?? '',
      });
    }
  }

  // Rebalance: transfer the same total from retained earnings (2091)
  // Making 2091 less negative = reducing equity, keeping balance sheet sum = 0
  const existingRetained = ibMap.get('2091') ?? 0;
  ibMap.set('2091', existingRetained + finalTotal);
}

// ---- Ensure VAT accounts exist ----

function ensureVATAccounts(accounts: SIEAccount[], templates: BlueprintTransactionTemplate[]): void {
  const vatRatesUsed = new Set<number>();
  for (const t of templates) {
    if (t.vatRate && t.vatRate > 0) vatRatesUsed.add(t.vatRate);
  }

  // Always add input VAT if any VAT is used
  if (vatRatesUsed.size > 0) {
    if (!accounts.some((a) => a.accountNumber === VAT_INPUT_ACCOUNT)) {
      accounts.push({
        accountNumber: VAT_INPUT_ACCOUNT,
        accountName: 'Ingående moms',
        accountGroup: ACCOUNT_GROUPS['1'] ?? '',
      });
    }
  }

  for (const rate of vatRatesUsed) {
    const acc = VAT_OUTPUT_ACCOUNTS[rate];
    if (acc && !accounts.some((a) => a.accountNumber === acc)) {
      accounts.push({
        accountNumber: acc,
        accountName: `Utgående moms ${rate}%`,
        accountGroup: ACCOUNT_GROUPS['2'] ?? '',
      });
    }
  }

  // VAT settlement account (1630)
  if (vatRatesUsed.size > 0 && !accounts.some((a) => a.accountNumber === '1630')) {
    accounts.push({
      accountNumber: '1630',
      accountName: 'Skattekonto',
      accountGroup: ACCOUNT_GROUPS['1'] ?? '',
    });
  }
}

// ---- Main expander ----

export function expandBlueprintToSIE(
  blueprint: CompanyBlueprint,
  request: GenerateCompanyRequest,
): SIEParseResult {
  const fiscalYear = request.fiscalYear ?? new Date().getFullYear() - 1;
  const includePreviousYear = request.includePreviousYear ?? true;
  const rand = seededRandom(hashString(blueprint.profile.companyName + fiscalYear));

  // Look up industry rules for seasonal multipliers
  const industry = blueprint.profile.industry as CompanyIndustry;
  const rules = INDUSTRY_RULES[industry] ?? null;
  const seasonalMultipliers = rules?.seasonalMultipliers ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  // -- Metadata --
  const today = new Date();
  const metadata: SIEMetadata = {
    companyName: blueprint.profile.companyName,
    currency: 'SEK',
    generatedDate: formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    sieType: '4',
    fiscalYearStart: formatDate(fiscalYear, 1, 1),
    fiscalYearEnd: formatDate(fiscalYear, 12, 31),
    orgNumber: blueprint.profile.orgNumber,
    omfattnDate: formatDate(fiscalYear, 12, 31),
  };

  // -- Accounts --
  const accounts: SIEAccount[] = blueprint.accounts.map((a) => ({
    accountNumber: a.number,
    accountName: a.name,
    accountGroup: ACCOUNT_GROUPS[a.number[0]!] ?? '',
  }));

  // Ensure VAT accounts exist
  ensureVATAccounts(accounts, blueprint.transactionTemplates);

  // Ensure bokslut accounts exist
  ensureBokslutAccounts(accounts);

  // -- Generate transactions for fiscal year --
  const { transactions, accountMovements, vatAccumulator } = generateTransactions(
    blueprint.transactionTemplates,
    fiscalYear,
    rand,
    seasonalMultipliers,
  );

  // -- Add quarterly VAT settlements --
  const vatSettlements = generateVATSettlements(vatAccumulator, fiscalYear, transactions, accountMovements);
  void vatSettlements; // movements already applied in-place

  // -- Add year-end (bokslut) entries --
  generateBokslutEntries(
    blueprint,
    fiscalYear,
    transactions,
    accountMovements,
    accounts,
  );

  // -- Compute balances --
  const balances: SIEBalance[] = [];

  // Opening balances (IB) for balance sheet accounts from blueprint
  const ibMap = new Map<string, number>();
  for (const ob of blueprint.openingBalances) {
    ibMap.set(ob.accountNumber, ob.amount);
  }

  // Normalize current ratio — adds missing current liabilities if ratio > 3.0
  normalizeCurrentRatio(blueprint, ibMap, accounts);

  // Write final IB balances
  for (const [accountNumber, amount] of ibMap) {
    balances.push({
      accountNumber,
      balanceType: 'IB',
      yearIndex: 0,
      amount,
    });
  }

  // RES for income statement accounts (class 3-8): sum of movements
  // UB for balance sheet accounts (class 1-2): IB + net movement
  const allAccountNumbers = new Set([
    ...ibMap.keys(),
    ...accountMovements.keys(),
  ]);

  for (const accNum of allAccountNumbers) {
    const type = getAccountType(accNum);
    const movement = accountMovements.get(accNum) ?? 0;

    if (type === 'INCOME_STATEMENT') {
      if (movement !== 0) {
        balances.push({
          accountNumber: accNum,
          balanceType: 'RES',
          yearIndex: 0,
          amount: movement,
        });
      }
    } else if (type === 'BALANCE_SHEET') {
      const ib = ibMap.get(accNum) ?? 0;
      balances.push({
        accountNumber: accNum,
        balanceType: 'UB',
        yearIndex: 0,
        amount: ib + movement,
      });
    }
  }

  // -- Previous year (optional) --
  if (includePreviousYear && blueprint.previousYearMultiplier != null) {
    const prevYear = fiscalYear - 1;
    const multiplier = blueprint.previousYearMultiplier;
    const prevRand = seededRandom(
      hashString(blueprint.profile.companyName + prevYear),
    );

    // Scale templates for previous year
    const prevTemplates = blueprint.transactionTemplates.map((t) => ({
      ...t,
      monthlyAmount: t.monthlyAmount * multiplier,
    }));

    const { accountMovements: prevMovements } = generateTransactions(
      prevTemplates,
      prevYear,
      prevRand,
      seasonalMultipliers,
    );

    // Previous year IB (scale from normalized ibMap, which includes added liabilities)
    for (const [accNum, amount] of ibMap) {
      const prevIB = amount * multiplier;
      balances.push({
        accountNumber: accNum,
        balanceType: 'IB',
        yearIndex: -1,
        amount: Math.round(prevIB * 100) / 100,
      });
    }

    // Previous year UB and RES
    const prevAllAccounts = new Set([...ibMap.keys(), ...prevMovements.keys()]);
    for (const accNum of prevAllAccounts) {
      const type = getAccountType(accNum);
      const movement = prevMovements.get(accNum) ?? 0;
      if (type === 'INCOME_STATEMENT') {
        if (movement !== 0) {
          balances.push({
            accountNumber: accNum,
            balanceType: 'RES',
            yearIndex: -1,
            amount: movement,
          });
        }
      } else if (type === 'BALANCE_SHEET') {
        const scaledIB =
          (ibMap.get(accNum) ?? 0) * multiplier;
        balances.push({
          accountNumber: accNum,
          balanceType: 'UB',
          yearIndex: -1,
          amount: Math.round((scaledIB + movement) * 100) / 100,
        });
      }
    }
  }

  // Sort transactions by date for cleaner output
  transactions.sort((a, b) => a.verificationDate.localeCompare(b.verificationDate));

  return {
    metadata,
    accounts,
    dimensions: [],
    transactions,
    balances,
  };
}

// ---- VAT accumulator ----

interface VATAccumulator {
  /** Output VAT per quarter (Q1=0, Q2=1, Q3=2, Q4=3) per rate */
  outputVAT: Map<number, number[]>;
  /** Input VAT per quarter */
  inputVAT: number[];
}

// ---- Main transaction generator ----

/** Generate transactions from templates for a given year. */
function generateTransactions(
  templates: BlueprintTransactionTemplate[],
  year: number,
  rand: () => number,
  seasonalMultipliers: number[],
): {
  transactions: SIETransaction[];
  accountMovements: Map<string, number>;
  vatAccumulator: VATAccumulator;
} {
  const transactions: SIETransaction[] = [];
  const accountMovements = new Map<string, number>();

  // Track verification numbers per series
  const seriesCounters: Record<string, number> = {};
  const getNextVerNum = (series: string): string => {
    const current = seriesCounters[series] ?? 0;
    seriesCounters[series] = current + 1;
    return String(current + 1);
  };

  // VAT tracking per quarter
  const vatAccumulator: VATAccumulator = {
    outputVAT: new Map(),
    inputVAT: [0, 0, 0, 0],
  };

  for (const template of templates) {
    const months = template.months ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const datePattern = inferDatePattern(template);
    const monthlyCount = inferMonthlyCount(template);
    const series = getVerificationSeries(template);
    const vatRate = template.vatRate ?? 0;

    // Determine if this template should have seasonal variation applied
    const credit = parseInt(template.creditAccount, 10);
    const debit = parseInt(template.debitAccount, 10);
    const isRevenue = credit >= 3000 && credit < 4000;
    const isCOGS = debit >= 4000 && debit < 5000;
    const applySeasonal = isRevenue || isCOGS;

    // Check if this is a salary template (for multi-leg handling)
    const isSalary = debit >= 7200 && debit < 7300;

    for (const month of months) {
      const seasonal = applySeasonal ? (seasonalMultipliers[month - 1] ?? 1) : 1;
      const baseMonthAmount = template.monthlyAmount * seasonal;

      if (isSalary) {
        // Multi-leg salary verification
        expandSalaryVerification(
          template,
          baseMonthAmount,
          year,
          month,
          rand,
          series,
          getNextVerNum,
          transactions,
          accountMovements,
        );
        continue;
      }

      // Split into multiple transactions if monthlyCount > 1
      const perTxAmount = baseMonthAmount / monthlyCount;

      for (let i = 0; i < monthlyCount; i++) {
        const amount = varyAmount(perTxAmount, template.variance, rand);
        if (amount === 0) continue;

        const date = getTransactionDate(year, month, datePattern, rand, i, monthlyCount);
        const verNum = getNextVerNum(series);
        const description = generateDescription(template, month, i, parseInt(verNum, 10));

        const quarter = Math.floor((month - 1) / 3);

        if (vatRate > 0 && isRevenue) {
          // Revenue with VAT: 3-line verification
          // gross = net + VAT → net = amount, VAT = amount * vatRate/100
          const net = amount;
          const vat = Math.round(net * vatRate / 100 * 100) / 100;
          const gross = Math.round((net + vat) * 100) / 100;

          // Bank receives gross
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.debitAccount, // 1930 (bank)
            amount: gross,
          });
          // Revenue account credited net
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.creditAccount, // 3xxx
            amount: -net,
          });
          // Output VAT credited
          const vatAccount = VAT_OUTPUT_ACCOUNTS[vatRate] ?? '2611';
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: vatAccount,
            amount: -vat,
          });

          // Track VAT for settlement
          if (!vatAccumulator.outputVAT.has(vatRate)) {
            vatAccumulator.outputVAT.set(vatRate, [0, 0, 0, 0]);
          }
          const outputArr = vatAccumulator.outputVAT.get(vatRate)!;
          outputArr[quarter] = (outputArr[quarter] ?? 0) + vat;
        } else if (vatRate > 0 && !isRevenue) {
          // Expense with VAT: 3-line verification
          const net = amount;
          const vat = Math.round(net * vatRate / 100 * 100) / 100;
          const gross = Math.round((net + vat) * 100) / 100;

          // Expense account debited net
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.debitAccount, // 5xxx, 6xxx etc
            amount: net,
          });
          // Input VAT debited
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: VAT_INPUT_ACCOUNT,
            amount: vat,
          });
          // Bank credited gross
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.creditAccount, // 1930 (bank)
            amount: -gross,
          });

          // Track input VAT for settlement
          vatAccumulator.inputVAT[quarter] = (vatAccumulator.inputVAT[quarter] ?? 0) + vat;
        } else {
          // No VAT: simple 2-line verification (legacy behavior)
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.debitAccount,
            amount: amount,
          });
          pushTransaction(transactions, accountMovements, {
            series, verNum, date, description,
            accountNumber: template.creditAccount,
            amount: -amount,
          });
        }
      }
    }
  }

  return { transactions, accountMovements, vatAccumulator };
}

/** Helper to push a transaction and track its movement. */
function pushTransaction(
  transactions: SIETransaction[],
  movements: Map<string, number>,
  opts: {
    series: string;
    verNum: string;
    date: string;
    description: string;
    accountNumber: string;
    amount: number;
  },
): void {
  transactions.push({
    verificationSeries: opts.series,
    verificationNumber: opts.verNum,
    verificationDate: opts.date,
    verificationText: opts.description,
    accountNumber: opts.accountNumber,
    amount: opts.amount,
    costCenter: '',
    project: '',
    rowText: opts.description,
  });

  movements.set(
    opts.accountNumber,
    (movements.get(opts.accountNumber) ?? 0) + opts.amount,
  );
}

// ---- Multi-leg salary verification (Phase 2.2) ----

function expandSalaryVerification(
  template: BlueprintTransactionTemplate,
  monthlyGrossSalary: number,
  year: number,
  month: number,
  rand: () => number,
  series: string,
  getNextVerNum: (s: string) => string,
  transactions: SIETransaction[],
  movements: Map<string, number>,
): void {
  const gross = varyAmount(monthlyGrossSalary, template.variance, rand);
  if (gross === 0) return;

  const date = getTransactionDate(year, month, 'salary', rand);
  const verNum = getNextVerNum(series);
  const description = `Löneutbetalning ${MONTH_NAMES[month - 1]!}`;

  // Compute derived amounts
  const paye = Math.round(gross * 0.30 * 100) / 100;           // ~30% PAYE withholding
  const socialSecurity = Math.round(gross * 0.3142 * 100) / 100; // 31.42% social security
  const pension = Math.round(gross * 0.05 * 100) / 100;         // 5% pension
  const netPay = Math.round((gross - paye) * 100) / 100;        // net to employee

  // Gross salary expense
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '7210', amount: gross,
  });
  // Social security expense
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '7510', amount: socialSecurity,
  });
  // Pension expense
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '7411', amount: pension,
  });
  // PAYE withholding liability
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '2710', amount: -paye,
  });
  // Social security liability
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '2730', amount: -socialSecurity,
  });
  // Net salary paid from bank
  pushTransaction(transactions, movements, {
    series, verNum, date, description,
    accountNumber: '1930', amount: -(netPay + pension),
  });
}

// ---- Quarterly VAT settlement (Phase 2.3) ----

function generateVATSettlements(
  vatAccumulator: VATAccumulator,
  year: number,
  transactions: SIETransaction[],
  movements: Map<string, number>,
): void {
  const quarterEndMonths = [3, 6, 9, 12];
  const quarterSettleDays = [12, 12, 12, 12]; // Filed on 12th of month after quarter

  for (let q = 0; q < 4; q++) {
    // Settlement date: 12th of month after quarter end (Apr, Jul, Oct, Jan+1)
    const settleMonth = quarterEndMonths[q]! + 1;
    const settleYear = settleMonth > 12 ? year + 1 : year;
    const actualMonth = settleMonth > 12 ? settleMonth - 12 : settleMonth;
    const date = formatDate(settleYear, actualMonth, quarterSettleDays[q]!);

    // Skip Q4 settlement if it falls into next year (we only generate for this year)
    if (settleYear > year) continue;

    // Compute totals for this quarter
    let totalOutputVAT = 0;
    for (const [, quarterAmounts] of vatAccumulator.outputVAT) {
      totalOutputVAT += quarterAmounts[q] ?? 0;
    }
    const totalInputVAT = vatAccumulator.inputVAT[q] ?? 0;

    if (totalOutputVAT === 0 && totalInputVAT === 0) continue;

    const netVAT = Math.round((totalOutputVAT - totalInputVAT) * 100) / 100;
    const verNum = String(100 + q);
    const description = `Momsredovisning Q${q + 1}`;

    // Clear output VAT (debit the liability account to zero it)
    for (const [rate, quarterAmounts] of vatAccumulator.outputVAT) {
      const amount = quarterAmounts[q] ?? 0;
      if (amount === 0) continue;
      const vatAccount = VAT_OUTPUT_ACCOUNTS[rate] ?? '2611';
      pushTransaction(transactions, movements, {
        series: 'D', verNum, date, description,
        accountNumber: vatAccount, amount: amount, // debit to clear the credit balance
      });
    }

    // Clear input VAT (credit to zero the debit balance)
    if (totalInputVAT > 0) {
      pushTransaction(transactions, movements, {
        series: 'D', verNum, date, description,
        accountNumber: VAT_INPUT_ACCOUNT, amount: -totalInputVAT,
      });
    }

    // Net to tax account (1630) — positive = we owe money
    if (netVAT !== 0) {
      pushTransaction(transactions, movements, {
        series: 'D', verNum, date, description,
        accountNumber: '1630', amount: -netVAT,
      });
    }
  }
}

// ---- Year-end closing entries (Phase 3.1) ----

function ensureBokslutAccounts(accounts: SIEAccount[]): void {
  // Ensure year-end adjustment accounts exist
  const bokslutAccounts = [
    { number: '2510', name: 'Skatteskulder', group: '2' },
    { number: '2920', name: 'Upplupna semesterlöner', group: '2' },
    { number: '7090', name: 'Förändring semesterlöneskuld', group: '7' },
  ];

  for (const ba of bokslutAccounts) {
    if (!accounts.some((a) => a.accountNumber === ba.number)) {
      accounts.push({
        accountNumber: ba.number,
        accountName: ba.name,
        accountGroup: ACCOUNT_GROUPS[ba.group] ?? '',
      });
    }
  }
}

function generateBokslutEntries(
  blueprint: CompanyBlueprint,
  year: number,
  transactions: SIETransaction[],
  movements: Map<string, number>,
  accounts: SIEAccount[],
): void {
  const date = formatDate(year, 12, 31);
  let verNumber = 1;

  // 1. Compute year's net income from movements (income statement accounts 3000-8999)
  let netIncome = 0;
  for (const [accNum, amount] of movements) {
    const num = parseInt(accNum, 10);
    if (num >= 3000 && num <= 8999) {
      netIncome += amount;
    }
  }

  // 2. Tax on year's result (if profitable and not already covered)
  // Check if tax template already exists in movements (8910)
  const existingTax = movements.get('8910') ?? 0;
  const profitBeforeTax = netIncome - existingTax; // Remove existing tax from net income calc
  if (profitBeforeTax < 0) {
    // Profitable (revenue is negative in SIE)
    const expectedTax = Math.round(Math.abs(profitBeforeTax) * 0.206 * 100) / 100;
    const taxAdjustment = Math.round((expectedTax - existingTax) * 100) / 100;

    if (taxAdjustment > 100) { // Only if meaningful difference
      const verNum = `YE${verNumber++}`;
      const description = 'Skatt på årets resultat (justering)';

      pushTransaction(transactions, movements, {
        series: 'YE', verNum, date, description,
        accountNumber: '8910', amount: taxAdjustment,
      });
      pushTransaction(transactions, movements, {
        series: 'YE', verNum, date, description,
        accountNumber: '2510', amount: -taxAdjustment,
      });

      // Ensure 2510 exists
      if (!accounts.some((a) => a.accountNumber === '2510')) {
        accounts.push({
          accountNumber: '2510',
          accountName: 'Skatteskulder',
          accountGroup: ACCOUNT_GROUPS['2'] ?? '',
        });
      }
    }
  }

  // 3. Accrued vacation pay adjustment
  {
    const verNum = `YE${verNumber++}`;
    const description = 'Semesterlöneskuld justering';
    const grossSalary = (blueprint.annualFinancials.totalPersonnelCosts / 1.4);
    const vacationLiability = Math.round(grossSalary * 0.12 * 100) / 100;
    // Small adjustment — typically a few percent of the existing liability
    const adjustment = Math.round(vacationLiability * 0.05 * 100) / 100;

    if (adjustment > 0) {
      pushTransaction(transactions, movements, {
        series: 'YE', verNum, date, description,
        accountNumber: '7090', amount: adjustment,
      });
      pushTransaction(transactions, movements, {
        series: 'YE', verNum, date, description,
        accountNumber: '2920', amount: -adjustment,
      });

      // Ensure accounts exist
      if (!accounts.some((a) => a.accountNumber === '7090')) {
        accounts.push({
          accountNumber: '7090',
          accountName: 'Förändring semesterlöneskuld',
          accountGroup: ACCOUNT_GROUPS['7'] ?? '',
        });
      }
      if (!accounts.some((a) => a.accountNumber === '2920')) {
        accounts.push({
          accountNumber: '2920',
          accountName: 'Upplupna semesterlöner',
          accountGroup: ACCOUNT_GROUPS['2'] ?? '',
        });
      }
    }
  }

  // Note: We intentionally do NOT close income statement to 8999/2099 here.
  // The KPI calculator computes net income from RES balances (income statement accounts).
  // A closing entry would zero out all income statement accounts, making net income = 0.
  // In a real SIE file this closing happens, but for demo/analysis purposes we keep
  // the income statement open so KPIs reflect the actual year's result.
}

// ---- Utilities ----

/** Simple string hash for seeding. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
