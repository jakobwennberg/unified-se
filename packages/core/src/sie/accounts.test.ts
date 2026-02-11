import { describe, it, expect } from 'vitest';
import {
  classifyAccount,
  isInRange,
  getAccountsInRange,
  getAccountType,
  sumAccountsInRange,
  calculateAdjustedEquity,
  calculateInterestBearingDebt,
  calculateNetSales,
  SWEDISH_ACCOUNTS,
  CORPORATE_TAX_RATE,
  EQUITY_PORTION_OF_UNTAXED_RESERVES,
} from './accounts.js';

describe('classifyAccount', () => {
  it('classifies asset accounts (1xxx)', () => {
    expect(classifyAccount('1910')).toBe('Kassa och bank');
    expect(classifyAccount('1510')).toBe('Kundfordringar');
    expect(classifyAccount('1200')).toBe('Maskiner och inventarier');
  });

  it('classifies equity accounts (2080-2099)', () => {
    expect(classifyAccount('2091')).toBe('Eget kapital');
  });

  it('classifies liability accounts', () => {
    expect(classifyAccount('2350')).toBe('Långfristiga skulder');
    expect(classifyAccount('2440')).toBe('Leverantörsskulder');
    expect(classifyAccount('2610')).toBe('Skatteskulder');
  });

  it('classifies revenue accounts (3xxx)', () => {
    expect(classifyAccount('3010')).toBe('Nettoomsättning');
    expect(classifyAccount('3750')).toBe('Rabatter och avdrag');
  });

  it('classifies cost accounts (4xxx-7xxx)', () => {
    expect(classifyAccount('4010')).toBe('Kostnader för sålda varor');
    expect(classifyAccount('5010')).toBe('Lokalkostnader');
    expect(classifyAccount('7010')).toBe('Personalkostnader');
    expect(classifyAccount('7810')).toBe('Avskrivningar');
    expect(classifyAccount('7710')).toBe('Nedskrivningar');
  });

  it('classifies financial accounts (8xxx)', () => {
    expect(classifyAccount('8100')).toBe('Finansiella intäkter');
    expect(classifyAccount('8410')).toBe('Räntekostnader');
    expect(classifyAccount('8910')).toBe('Skatter');
  });

  it('returns null for invalid account numbers', () => {
    expect(classifyAccount('abc')).toBeNull();
  });

  it('accepts numeric input', () => {
    expect(classifyAccount(1510)).toBe('Kundfordringar');
  });

  it('returns null for accounts not in any range', () => {
    expect(classifyAccount('2050')).toBeNull();
    expect(classifyAccount('8550')).toBeNull();
  });
});

describe('isInRange', () => {
  it('works with explicit min/max numbers', () => {
    expect(isInRange('1910', 1900, 1999)).toBe(true);
    expect(isInRange('1910', 2000, 2999)).toBe(false);
  });

  it('works with AccountRange object', () => {
    expect(isInRange('1910', SWEDISH_ACCOUNTS.CURRENT_ASSETS.CASH_AND_BANK)).toBe(true);
    expect(isInRange('1510', SWEDISH_ACCOUNTS.CURRENT_ASSETS.CASH_AND_BANK)).toBe(false);
  });

  it('is inclusive on boundaries', () => {
    expect(isInRange('1900', 1900, 1999)).toBe(true);
    expect(isInRange('1999', 1900, 1999)).toBe(true);
  });
});

describe('sumAccountsInRange', () => {
  it('sums amounts within range', () => {
    const balances = [
      { accountNumber: '1910', amount: 5000 },
      { accountNumber: '1920', amount: 3000 },
      { accountNumber: '3010', amount: -10000 },
    ];
    const result = sumAccountsInRange(balances, SWEDISH_ACCOUNTS.CURRENT_ASSETS.CASH_AND_BANK);
    expect(result).toBe(8000);
  });

  it('returns 0 for no matches', () => {
    const balances = [{ accountNumber: '1910', amount: 5000 }];
    expect(sumAccountsInRange(balances, SWEDISH_ACCOUNTS.EQUITY.ALL)).toBe(0);
  });
});

describe('getAccountType', () => {
  it('identifies balance sheet accounts', () => {
    expect(getAccountType('1910')).toBe('BALANCE_SHEET');
    expect(getAccountType('2440')).toBe('BALANCE_SHEET');
  });

  it('identifies income statement accounts', () => {
    expect(getAccountType('3010')).toBe('INCOME_STATEMENT');
    expect(getAccountType('7010')).toBe('INCOME_STATEMENT');
  });

  it('returns UNKNOWN for invalid accounts', () => {
    expect(getAccountType('abc')).toBe('UNKNOWN');
    expect(getAccountType('9999')).toBe('UNKNOWN');
  });
});

describe('getAccountsInRange', () => {
  it('filters accounts with { number } shape', () => {
    const accounts = [
      { number: '1510', name: 'Kundfordringar' },
      { number: '1910', name: 'Kassa' },
      { number: '1920', name: 'PlusGiro' },
      { number: '3010', name: 'Försäljning' },
    ];
    const result = getAccountsInRange(accounts, 1900, 1999);
    expect(result).toHaveLength(2);
    expect(result[0]!.number).toBe('1910');
  });

  it('filters accounts with { accountNumber } shape (SIEAccount)', () => {
    const accounts = [
      { accountNumber: '1510', accountName: 'Kundfordringar', accountGroup: '' },
      { accountNumber: '1910', accountName: 'Kassa', accountGroup: '' },
      { accountNumber: '3010', accountName: 'Försäljning', accountGroup: '' },
    ];
    const result = getAccountsInRange(accounts, 1500, 1599);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountNumber).toBe('1510');
  });
});

describe('calculateAdjustedEquity', () => {
  it('calculates equity + 79.4% of untaxed reserves', () => {
    const balanceSheet = [
      { accountNumber: '2091', amount: -100000 }, // Equity (negative in SIE)
      { accountNumber: '2150', amount: -50000 }, // Untaxed reserves (negative in SIE)
    ];
    const result = calculateAdjustedEquity(balanceSheet);
    // 100000 + 50000 * 0.794 = 139700
    expect(result).toBeCloseTo(139700, 0);
  });
});

describe('calculateInterestBearingDebt', () => {
  it('sums long-term (2310-2359) and short-term (2840-2849) debt', () => {
    const balanceSheet = [
      { accountNumber: '2320', amount: -200000 }, // Bank loan
      { accountNumber: '2840', amount: -30000 }, // Short-term loan
      { accountNumber: '2440', amount: -50000 }, // Accounts payable (not interest-bearing)
    ];
    const result = calculateInterestBearingDebt(balanceSheet);
    expect(result).toBe(230000);
  });
});

describe('calculateNetSales', () => {
  it('calculates gross sales minus discounts', () => {
    const incomeStatement = [
      { accountNumber: '3010', amount: -500000 }, // Sales (negative in SIE)
      { accountNumber: '3750', amount: -10000 }, // Discounts (negative in SIE)
    ];
    const result = calculateNetSales(incomeStatement);
    expect(result).toBe(490000);
  });
});

describe('SWEDISH_ACCOUNTS constants', () => {
  it('has correct equity range (2080-2099)', () => {
    expect(SWEDISH_ACCOUNTS.EQUITY.ALL.min).toBe(2080);
    expect(SWEDISH_ACCOUNTS.EQUITY.ALL.max).toBe(2099);
  });

  it('has correct tax rate', () => {
    expect(CORPORATE_TAX_RATE).toBe(0.206);
    expect(EQUITY_PORTION_OF_UNTAXED_RESERVES).toBeCloseTo(0.794, 3);
  });
});
