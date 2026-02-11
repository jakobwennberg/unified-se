import { describe, it, expect } from 'vitest';
import { parseSIE } from './parser.js';

const SAMPLE_SIE = `#FLAGGA 0
#PROGRAM "TestProgram" 1.0
#FORMAT PC8
#GEN 20240101
#SIETYP 4
#FNAMN "Test AB"
#ORGNR 5566778899
#RAR 0 20240101 20241231
#RAR -1 20230101 20231231
#KONTO 1910 "Kassa"
#KONTO 1920 "PlusGiro"
#KONTO 3010 "Försäljning varor"
#KONTO 4010 "Inköp varor"
#SRU 1910 7201
#IB 0 1910 5000.00
#UB 0 1910 8000.00
#IB 0 1920 10000.00
#UB 0 1920 12000.00
#UB 0 3010 -50000.00
#UB 0 4010 30000.00
#RES 0 3010 -50000.00
#RES 0 4010 30000.00
#OBJEKT 1 10 "Avdelning A"
#VER A 1 20240115 "Försäljning"
{
#TRANS 1910 {} 1000.00
#TRANS 3010 {} -1000.00
}
#VER A 2 20240120 "Inköp"
{
#TRANS 4010 {} 500.00
#TRANS 1910 {} -500.00
}`;

describe('parseSIE', () => {
  it('parses metadata', () => {
    const result = parseSIE(SAMPLE_SIE);
    expect(result.metadata.companyName).toBe('Test AB');
    expect(result.metadata.sieType).toBe('4');
    expect(result.metadata.currency).toBe('SEK');
    expect(result.metadata.generatedDate).toBe('2024-01-01');
    expect(result.metadata.orgNumber).toBe('5566778899');
  });

  it('parses fiscal year', () => {
    const result = parseSIE(SAMPLE_SIE);
    expect(result.metadata.fiscalYearStart).toBe('2024-01-01');
    expect(result.metadata.fiscalYearEnd).toBe('2024-12-31');
  });

  it('parses accounts with groups and tax codes', () => {
    const result = parseSIE(SAMPLE_SIE);
    expect(result.accounts).toHaveLength(4);
    expect(result.accounts[0]).toEqual({
      accountNumber: '1910',
      accountName: 'Kassa',
      accountGroup: '1 - Tillgångar',
      taxCode: '7201',
    });
    expect(result.accounts[2]).toEqual({
      accountNumber: '3010',
      accountName: 'Försäljning varor',
      accountGroup: '3 - Rörelsens inkomster och intäkter',
      taxCode: undefined,
    });
  });

  it('parses dimensions', () => {
    const result = parseSIE(SAMPLE_SIE);
    expect(result.dimensions).toHaveLength(1);
    expect(result.dimensions[0]).toEqual({
      dimensionType: 1,
      code: '10',
      name: 'Avdelning A',
    });
  });

  it('parses IB and UB balances', () => {
    const result = parseSIE(SAMPLE_SIE);
    const ibBalances = result.balances.filter((b) => b.balanceType === 'IB');
    const ubBalances = result.balances.filter((b) => b.balanceType === 'UB');
    expect(ibBalances).toHaveLength(2);
    expect(ubBalances).toHaveLength(4);
    expect(ibBalances[0]).toEqual({
      accountNumber: '1910',
      balanceType: 'IB',
      yearIndex: 0,
      amount: 5000,
      quantity: undefined,
    });
  });

  it('parses RES balances', () => {
    const result = parseSIE(SAMPLE_SIE);
    const resBalances = result.balances.filter((b) => b.balanceType === 'RES');
    expect(resBalances).toHaveLength(2);
    expect(resBalances[0]).toEqual({
      accountNumber: '3010',
      balanceType: 'RES',
      yearIndex: 0,
      amount: -50000,
      quantity: undefined,
    });
  });

  it('parses flattened transactions', () => {
    const result = parseSIE(SAMPLE_SIE);
    // 2 verifications × 2 rows each = 4 flattened transactions
    expect(result.transactions).toHaveLength(4);

    // First transaction row
    expect(result.transactions[0]!.verificationSeries).toBe('A');
    expect(result.transactions[0]!.verificationNumber).toBe('1');
    expect(result.transactions[0]!.verificationDate).toBe('20240115');
    expect(result.transactions[0]!.verificationText).toBe('Försäljning');
    expect(result.transactions[0]!.accountNumber).toBe('1910');
    expect(result.transactions[0]!.amount).toBe(1000);

    // Second verification, first row
    expect(result.transactions[2]!.verificationSeries).toBe('A');
    expect(result.transactions[2]!.verificationNumber).toBe('2');
    expect(result.transactions[2]!.accountNumber).toBe('4010');
    expect(result.transactions[2]!.amount).toBe(500);
  });

  it('skips BTRANS and RTRANS rows', () => {
    const sieWithReversals = `#FLAGGA 0
#FNAMN "Test"
#VER A 1 20240115 "Test"
{
#TRANS 1910 {} 1000.00
#BTRANS 1910 {} 1000.00
#RTRANS 1910 {} -1000.00
#TRANS 3010 {} -1000.00
}`;
    const result = parseSIE(sieWithReversals);
    expect(result.transactions).toHaveLength(2);
  });

  it('parses dimensions in transactions', () => {
    const sieWithDims = `#FLAGGA 0
#FNAMN "Test"
#VER A 1 20240115 "Test"
{
#TRANS 5010 {1 10 6 200} 1500.00
}`;
    const result = parseSIE(sieWithDims);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]!.costCenter).toBe('10');
    expect(result.transactions[0]!.project).toBe('200');
  });

  it('handles empty input', () => {
    const result = parseSIE('');
    expect(result.accounts).toHaveLength(0);
    expect(result.transactions).toHaveLength(0);
    expect(result.balances).toHaveLength(0);
    expect(result.metadata.companyName).toBe('Okänd');
  });

  it('handles negative zero amounts', () => {
    const sieContent = `#FLAGGA 0
#FNAMN "Test"
#UB 0 1910 -0`;
    const result = parseSIE(sieContent);
    expect(result.balances[0]!.amount).toBe(0);
    expect(Object.is(result.balances[0]!.amount, -0)).toBe(false);
  });

  it('handles CRLF line endings', () => {
    const crlfSie = '#FLAGGA 0\r\n#FNAMN "Test AB"\r\n#KONTO 1910 "Kassa"\r\n';
    const result = parseSIE(crlfSie);
    expect(result.metadata.companyName).toBe('Test AB');
    expect(result.accounts).toHaveLength(1);
  });

  it('handles escaped quotes in strings', () => {
    const sieContent = `#FLAGGA 0
#FNAMN "Test ""AB"""`;
    const result = parseSIE(sieContent);
    expect(result.metadata.companyName).toBe('Test "AB"');
  });
});
