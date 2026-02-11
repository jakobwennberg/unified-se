/**
 * Deterministic blueprint expander.
 *
 * Takes an AI-generated "financial blueprint" (structured JSON) and expands
 * it into a full SIEParseResult with individual transactions, balanced
 * verifications, and correct opening/closing/result balances.
 *
 * No LLM calls — this is pure TypeScript math.
 */
import type {
  SIEParseResult,
  SIEMetadata,
  SIEAccount,
  SIEBalance,
  SIETransaction,
  GenerateCompanyRequest,
} from '@arcim-sync/core';
import { classifyAccount, getAccountType } from '@arcim-sync/core/sie';

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

/** Get a business day (roughly mid-month) for a given month. */
function midMonthDate(year: number, month: number, rand: () => number): string {
  const day = 10 + Math.floor(rand() * 15); // 10th - 24th
  return formatDate(year, month, day);
}

// ---- Main expander ----

export function expandBlueprintToSIE(
  blueprint: CompanyBlueprint,
  request: GenerateCompanyRequest,
): SIEParseResult {
  const fiscalYear = request.fiscalYear ?? new Date().getFullYear() - 1;
  const includePreviousYear = request.includePreviousYear ?? true;
  const rand = seededRandom(hashString(blueprint.profile.companyName + fiscalYear));

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

  // -- Generate transactions for fiscal year --
  const { transactions, accountMovements } = generateTransactions(
    blueprint.transactionTemplates,
    fiscalYear,
    rand,
    'A',
  );

  // -- Compute balances --
  const balances: SIEBalance[] = [];

  // Opening balances (IB) for balance sheet accounts from blueprint
  const ibMap = new Map<string, number>();
  for (const ob of blueprint.openingBalances) {
    ibMap.set(ob.accountNumber, ob.amount);
    balances.push({
      accountNumber: ob.accountNumber,
      balanceType: 'IB',
      yearIndex: 0,
      amount: ob.amount,
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
      'B',
    );

    // Previous year IB (scale opening balances)
    for (const ob of blueprint.openingBalances) {
      const prevIB = ob.amount * multiplier;
      balances.push({
        accountNumber: ob.accountNumber,
        balanceType: 'IB',
        yearIndex: -1,
        amount: Math.round(prevIB * 100) / 100,
      });
    }

    // Previous year UB and RES
    for (const [accNum, movement] of prevMovements) {
      const type = getAccountType(accNum);
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

  return {
    metadata,
    accounts,
    dimensions: [],
    transactions,
    balances,
  };
}

/** Generate transactions from templates for a given year. */
function generateTransactions(
  templates: BlueprintTransactionTemplate[],
  year: number,
  rand: () => number,
  series: string,
): {
  transactions: SIETransaction[];
  accountMovements: Map<string, number>;
} {
  const transactions: SIETransaction[] = [];
  const accountMovements = new Map<string, number>();
  let verNumber = 1;

  for (const template of templates) {
    const months = template.months ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    for (const month of months) {
      const amount = varyAmount(template.monthlyAmount, template.variance, rand);
      if (amount === 0) continue;

      const date = midMonthDate(year, month, rand);
      const verNum = String(verNumber);

      // Debit entry (positive amount on debit account)
      transactions.push({
        verificationSeries: series,
        verificationNumber: verNum,
        verificationDate: date,
        verificationText: template.description,
        accountNumber: template.debitAccount,
        amount: amount,
        costCenter: '',
        project: '',
        rowText: template.description,
      });

      // Credit entry (negative amount on credit account)
      transactions.push({
        verificationSeries: series,
        verificationNumber: verNum,
        verificationDate: date,
        verificationText: template.description,
        accountNumber: template.creditAccount,
        amount: -amount,
        costCenter: '',
        project: '',
        rowText: template.description,
      });

      // Track net movements per account
      accountMovements.set(
        template.debitAccount,
        (accountMovements.get(template.debitAccount) ?? 0) + amount,
      );
      accountMovements.set(
        template.creditAccount,
        (accountMovements.get(template.creditAccount) ?? 0) - amount,
      );

      verNumber++;
    }
  }

  return { transactions, accountMovements };
}

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
