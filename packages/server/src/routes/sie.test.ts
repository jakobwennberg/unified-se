import { describe, it, expect, beforeEach } from 'vitest';
import { SQLiteAdapter } from '@arcim-sync/core';
import type { SIEFullData } from '@arcim-sync/core';
import { createServer } from '../app.js';

function makeSIEData(connectionId: string): SIEFullData {
  return {
    connectionId,
    fiscalYear: 2024,
    sieType: 4,
    parsed: {
      metadata: {
        companyName: 'Test AB',
        currency: 'SEK',
        generatedDate: '2024-01-01',
        sieType: '4',
        fiscalYearStart: '20240101',
        fiscalYearEnd: '20241231',
      },
      accounts: [
        { accountNumber: '1910', accountName: 'Kassa', accountGroup: '1 - Tillgångar' },
      ],
      dimensions: [],
      transactions: [
        {
          verificationSeries: 'A',
          verificationNumber: '1',
          verificationDate: '2024-01-15',
          verificationText: 'Test',
          accountNumber: '1910',
          amount: 1000,
          costCenter: '',
          project: '',
          rowText: '',
        },
      ],
      balances: [],
    },
    kpis: {
      totalAssets: 0, fixedAssets: 0, currentAssets: 0, inventory: 0,
      customerReceivables: 0, cashAndBank: 0, totalEquity: 0,
      untaxedReserves: 0, adjustedEquity: 0, deferredTaxLiability: 0,
      provisions: 0, longTermLiabilities: 0, currentLiabilities: 0,
      totalLiabilities: 0, interestBearingDebt: 0, netDebt: 0,
      accountsPayable: 0, netSales: 0, totalOperatingIncome: 0,
      costOfGoodsSold: 0, grossProfit: 0, externalCosts: 0,
      personnelCosts: 0, writeDowns: 0, depreciation: 0, ebitda: 0,
      ebit: 0, financialIncome: 0, interestExpenses: 0, financialNet: 0,
      resultBeforeTax: 0, tax: 0, netIncome: 0, grossMargin: null,
      ebitdaMargin: null, operatingMargin: null, profitMargin: null,
      netMargin: null, roa: null, roe: null, roce: null,
      equityRatio: null, debtToEquityRatio: null, deRatio: null,
      netDebtToEbitda: null, interestCoverageRatio: null,
      cashRatio: null, quickRatio: null, currentRatio: null,
      workingCapital: null, workingCapitalRatio: null, dio: null,
      dso: null, dpo: null, ccc: null, assetTurnover: null,
      revenueGrowth: null, assetGrowth: null, equityGrowth: null,
      annualizationFactor: 1, daysInPeriod: 366, isPartialYear: false,
    },
  };
}

describe('SIE routes', () => {
  let db: SQLiteAdapter;
  let app: ReturnType<typeof createServer>;
  const connId = 'sie-conn-1';

  beforeEach(async () => {
    db = new SQLiteAdapter(':memory:');
    await db.migrate();
    app = createServer({ db });

    await db.upsertConnection({
      connectionId: connId,
      provider: 'fortnox',
      displayName: 'Test AB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('GET /sie/:connId/uploads lists uploads', async () => {
    await db.storeSIEData(connId, makeSIEData(connId));

    const res = await app.request(`/sie/${connId}/uploads`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].fiscalYear).toBe(2024);
    expect(body[0].sieType).toBe(4);
    expect(body[0].accountCount).toBe(1);
    expect(body[0].transactionCount).toBe(1);
  });

  it('GET /sie/:connId/:uploadId returns full SIE data', async () => {
    const uploadId = await db.storeSIEData(connId, makeSIEData(connId));

    const res = await app.request(`/sie/${connId}/${uploadId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connectionId).toBe(connId);
    expect(body.parsed).toBeDefined();
    expect(body.kpis).toBeDefined();
  });

  it('GET /sie/:connId/:uploadId returns 404 when not found', async () => {
    const res = await app.request(`/sie/${connId}/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('SIE upload not found');
  });

  it('GET /sie/:connId/uploads returns empty list', async () => {
    const res = await app.request(`/sie/${connId}/uploads`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(0);
  });
});
