'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createApiClient } from '@arcim-sync/dashboard';
import { ResourceBrowser } from '@arcim-sync/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OnboardingLink } from '@/components/admin/onboarding-link';
import { ArrowLeft } from 'lucide-react';

const STATUS_VARIANTS: Record<number, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  0: 'warning',
  1: 'success',
  2: 'destructive',
  3: 'secondary',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Created',
  1: 'Accepted',
  2: 'Revoked',
  3: 'Inactive',
};

const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
  bokio: 'Bokio',
  bjornlunden: 'Bjorn Lunden',
  'sie-upload': 'Manual SIE Upload',
};

interface ConsentDetail {
  id: string;
  name: string;
  provider: string;
  company_name: string | null;
  org_number: string | null;
  status: number;
  etag: string;
  created_at: string;
  updated_at: string;
  system_settings_id: string | null;
}

interface SIEKPIs {
  // Balance sheet
  totalAssets: number;
  fixedAssets: number;
  currentAssets: number;
  inventory: number;
  customerReceivables: number;
  cashAndBank: number;
  totalEquity: number;
  untaxedReserves: number;
  adjustedEquity: number;
  provisions: number;
  longTermLiabilities: number;
  currentLiabilities: number;
  totalLiabilities: number;
  interestBearingDebt: number;
  netDebt: number;
  accountsPayable: number;
  // Income statement
  netSales: number;
  totalOperatingIncome: number;
  costOfGoodsSold: number;
  grossProfit: number;
  externalCosts: number;
  personnelCosts: number;
  depreciation: number;
  ebitda: number;
  ebit: number;
  financialIncome: number;
  interestExpenses: number;
  financialNet: number;
  resultBeforeTax: number;
  tax: number;
  netIncome: number;
  // Margins
  grossMargin: number | null;
  ebitdaMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  netMargin: number | null;
  // Returns
  roa: number | null;
  roe: number | null;
  roce: number | null;
  // Capital structure
  equityRatio: number | null;
  debtToEquityRatio: number | null;
  interestCoverageRatio: number | null;
  // Liquidity
  quickRatio: number | null;
  currentRatio: number | null;
  workingCapital: number | null;
  // Efficiency
  dso: number | null;
  dpo: number | null;
  assetTurnover: number | null;
  // Growth
  revenueGrowth: number | null;
  // Meta
  daysInPeriod: number;
  isPartialYear: boolean;
}

interface SIEUploadSummary {
  uploadId: string;
  fiscalYear: string;
  sieType: number;
  accountCount: number;
  transactionCount: number;
  uploadedAt: string;
  balanceCount: number;
  dimensionCount: number;
  metadata: {
    companyName: string;
    currency: string;
    fiscalYearStart: string | null;
    fiscalYearEnd: string | null;
    orgNumber?: string;
  } | null;
  kpis: SIEKPIs | null;
}

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number | null): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatRatio(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

function formatDays(value: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)} days`;
}

function KpiRow({ label, value, format = 'sek' }: { label: string; value: number | null; format?: 'sek' | 'pct' | 'ratio' | 'days' }) {
  if (value == null && format !== 'sek') return null;
  const formatted = format === 'sek' ? formatSEK(value ?? 0)
    : format === 'pct' ? formatPct(value)
    : format === 'days' ? formatDays(value)
    : formatRatio(value);
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatted}</span>
    </div>
  );
}

export default function ConsentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consentId = params.consentId as string;

  const [consent, setConsent] = useState<ConsentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [sieUploads, setSieUploads] = useState<SIEUploadSummary[]>([]);
  const [sieLoading, setSieLoading] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);

  // Create API client that proxies through our route handler
  const apiClient = useMemo(
    () => createApiClient('/api/proxy'),
    [],
  );

  const fetchConsent = useCallback(async () => {
    const res = await fetch(`/api/proxy/api/v1/consents/${consentId}`);
    if (res.ok) {
      const data = await res.json();
      setConsent(data);
    }
    setLoading(false);
  }, [consentId]);

  const fetchSieUploads = useCallback(async () => {
    setSieLoading(true);
    try {
      const res = await fetch(`/api/proxy/api/v1/consents/${consentId}/sie`);
      if (res.ok) {
        const data = await res.json();
        setSieUploads(data.data ?? []);
      }
    } finally {
      setSieLoading(false);
    }
  }, [consentId]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  useEffect(() => {
    if (consent?.provider === 'sie-upload' && consent.status === 1) {
      fetchSieUploads();
    }
  }, [consent?.provider, consent?.status, fetchSieUploads]);

  const handleRevoke = async () => {
    if (!consent) return;
    if (!confirm('Are you sure you want to revoke this consent?')) return;

    setRevoking(true);
    try {
      await fetch(`/api/proxy/api/v1/consents/${consentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': consent.etag,
        },
        body: JSON.stringify({ status: 2 }),
      });
      fetchConsent();
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading consent...</p>;
  }

  if (!consent) {
    return <p className="text-destructive">Consent not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/consents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{consent.name}</h1>
        <Badge variant={STATUS_VARIANTS[consent.status] ?? 'secondary'}>
          {STATUS_LABELS[consent.status] ?? 'Unknown'}
        </Badge>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="data">Data Explorer</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Link</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consent Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">ID</dt>
                  <dd className="font-mono">{consent.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Provider</dt>
                  <dd>{PROVIDER_LABELS[consent.provider] ?? consent.provider}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Company</dt>
                  <dd>{consent.company_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Org Number</dt>
                  <dd>{consent.org_number ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Created</dt>
                  <dd>{new Date(consent.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Updated</dt>
                  <dd>{new Date(consent.updated_at).toLocaleString()}</dd>
                </div>
              </dl>

              {consent.status === 1 && (
                <div className="mt-6">
                  <Button
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    {revoking ? 'Revoking...' : 'Revoke Consent'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardContent className="pt-6">
              {consent.status !== 1 ? (
                <p className="text-sm text-muted-foreground">
                  Data Explorer is only available for accepted consents.
                </p>
              ) : consent.provider === 'sie-upload' ? (
                <div className="space-y-4">
                  {sieLoading ? (
                    <p className="text-sm text-muted-foreground">Loading SIE data...</p>
                  ) : sieUploads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No SIE files uploaded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {sieUploads.map((upload) => {
                        const expanded = expandedUpload === upload.uploadId;
                        const k = upload.kpis;
                        return (
                          <div key={upload.uploadId} className="rounded-md border">
                            {/* Header — always visible */}
                            <button
                              onClick={() => setExpandedUpload(expanded ? null : upload.uploadId)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    {upload.metadata?.companyName ?? 'Unknown Company'}
                                  </span>
                                  <Badge variant="secondary">FY {upload.fiscalYear}</Badge>
                                  <Badge variant="secondary">SIE {upload.sieType}</Badge>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  {upload.metadata?.orgNumber && <span>Org: {upload.metadata.orgNumber}</span>}
                                  <span>{upload.accountCount} accounts</span>
                                  <span>{upload.transactionCount} transactions</span>
                                  <span>{upload.balanceCount} balances</span>
                                </div>
                              </div>
                              <svg
                                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>

                            {/* Expanded detail */}
                            {expanded && k && (
                              <div className="border-t px-4 pb-4 pt-3 space-y-5 text-sm">
                                {/* Key figures row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="rounded-md bg-muted/50 p-3">
                                    <div className="text-xs text-muted-foreground">Net Sales</div>
                                    <div className="text-lg font-semibold tabular-nums">{formatSEK(k.netSales)}</div>
                                    {k.revenueGrowth != null && (
                                      <div className={`text-xs ${k.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {k.revenueGrowth >= 0 ? '+' : ''}{(k.revenueGrowth * 100).toFixed(1)}% YoY
                                      </div>
                                    )}
                                  </div>
                                  <div className="rounded-md bg-muted/50 p-3">
                                    <div className="text-xs text-muted-foreground">EBIT</div>
                                    <div className="text-lg font-semibold tabular-nums">{formatSEK(k.ebit)}</div>
                                    {k.operatingMargin != null && (
                                      <div className="text-xs text-muted-foreground">{formatPct(k.operatingMargin)} margin</div>
                                    )}
                                  </div>
                                  <div className="rounded-md bg-muted/50 p-3">
                                    <div className="text-xs text-muted-foreground">Net Income</div>
                                    <div className="text-lg font-semibold tabular-nums">{formatSEK(k.netIncome)}</div>
                                    {k.netMargin != null && (
                                      <div className="text-xs text-muted-foreground">{formatPct(k.netMargin)} margin</div>
                                    )}
                                  </div>
                                  <div className="rounded-md bg-muted/50 p-3">
                                    <div className="text-xs text-muted-foreground">Total Assets</div>
                                    <div className="text-lg font-semibold tabular-nums">{formatSEK(k.totalAssets)}</div>
                                    <div className="text-xs text-muted-foreground">Equity ratio {formatPct(k.equityRatio)}</div>
                                  </div>
                                </div>

                                {/* Period info */}
                                {upload.metadata && (
                                  <div className="flex gap-4 text-xs text-muted-foreground">
                                    {upload.metadata.fiscalYearStart && upload.metadata.fiscalYearEnd && (
                                      <span>Period: {upload.metadata.fiscalYearStart} to {upload.metadata.fiscalYearEnd}</span>
                                    )}
                                    <span>{k.daysInPeriod} days</span>
                                    {k.isPartialYear && <Badge variant="warning">Partial year</Badge>}
                                    {upload.metadata.currency && <span>Currency: {upload.metadata.currency}</span>}
                                  </div>
                                )}

                                {/* Two-column detail grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Income Statement */}
                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Income Statement</h4>
                                    <KpiRow label="Net Sales" value={k.netSales} />
                                    <KpiRow label="Cost of Goods Sold" value={k.costOfGoodsSold} />
                                    <KpiRow label="Gross Profit" value={k.grossProfit} />
                                    <KpiRow label="External Costs" value={k.externalCosts} />
                                    <KpiRow label="Personnel Costs" value={k.personnelCosts} />
                                    <KpiRow label="Depreciation" value={k.depreciation} />
                                    <KpiRow label="EBITDA" value={k.ebitda} />
                                    <KpiRow label="EBIT" value={k.ebit} />
                                    <KpiRow label="Financial Net" value={k.financialNet} />
                                    <KpiRow label="Result Before Tax" value={k.resultBeforeTax} />
                                    <KpiRow label="Tax" value={k.tax} />
                                    <div className="border-t pt-1">
                                      <KpiRow label="Net Income" value={k.netIncome} />
                                    </div>
                                  </div>

                                  {/* Balance Sheet */}
                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Balance Sheet</h4>
                                    <KpiRow label="Fixed Assets" value={k.fixedAssets} />
                                    <KpiRow label="Current Assets" value={k.currentAssets} />
                                    <div className="pl-3 text-xs">
                                      <KpiRow label="Inventory" value={k.inventory} />
                                      <KpiRow label="Customer Receivables" value={k.customerReceivables} />
                                      <KpiRow label="Cash & Bank" value={k.cashAndBank} />
                                    </div>
                                    <div className="border-t pt-1">
                                      <KpiRow label="Total Assets" value={k.totalAssets} />
                                    </div>
                                    <div className="mt-2" />
                                    <KpiRow label="Total Equity" value={k.totalEquity} />
                                    <KpiRow label="Untaxed Reserves" value={k.untaxedReserves} />
                                    <KpiRow label="Long-term Liabilities" value={k.longTermLiabilities} />
                                    <KpiRow label="Current Liabilities" value={k.currentLiabilities} />
                                    <div className="border-t pt-1">
                                      <KpiRow label="Total Liabilities" value={k.totalLiabilities} />
                                    </div>
                                  </div>
                                </div>

                                {/* Ratios */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Margins</h4>
                                    <KpiRow label="Gross Margin" value={k.grossMargin} format="pct" />
                                    <KpiRow label="EBITDA Margin" value={k.ebitdaMargin} format="pct" />
                                    <KpiRow label="Operating Margin" value={k.operatingMargin} format="pct" />
                                    <KpiRow label="Profit Margin" value={k.profitMargin} format="pct" />
                                    <KpiRow label="Net Margin" value={k.netMargin} format="pct" />
                                  </div>

                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Capital & Liquidity</h4>
                                    <KpiRow label="Equity Ratio" value={k.equityRatio} format="pct" />
                                    <KpiRow label="Debt/Equity" value={k.debtToEquityRatio} format="ratio" />
                                    <KpiRow label="Interest Coverage" value={k.interestCoverageRatio} format="ratio" />
                                    <KpiRow label="Quick Ratio" value={k.quickRatio} format="ratio" />
                                    <KpiRow label="Current Ratio" value={k.currentRatio} format="ratio" />
                                    <KpiRow label="Working Capital" value={k.workingCapital} />
                                  </div>

                                  <div className="space-y-1">
                                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Returns & Efficiency</h4>
                                    <KpiRow label="ROA" value={k.roa} format="pct" />
                                    <KpiRow label="ROE" value={k.roe} format="pct" />
                                    <KpiRow label="ROCE" value={k.roce} format="pct" />
                                    <KpiRow label="Asset Turnover" value={k.assetTurnover} format="ratio" />
                                    <KpiRow label="DSO" value={k.dso} format="days" />
                                    <KpiRow label="DPO" value={k.dpo} format="days" />
                                  </div>
                                </div>

                                <div className="text-xs text-muted-foreground pt-2 border-t">
                                  Uploaded {new Date(upload.uploadedAt).toLocaleString()}
                                </div>
                              </div>
                            )}

                            {/* Collapsed — no KPIs, just a hint */}
                            {!expanded && upload.kpis && (
                              <div className="border-t px-4 py-2 flex gap-6 text-xs text-muted-foreground">
                                <span>Sales: {formatSEK(upload.kpis.netSales)}</span>
                                <span>EBIT: {formatSEK(upload.kpis.ebit)}</span>
                                <span>Assets: {formatSEK(upload.kpis.totalAssets)}</span>
                                <span>Equity Ratio: {formatPct(upload.kpis.equityRatio)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <ResourceBrowser api={apiClient} consentId={consentId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingLink consentId={consentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
