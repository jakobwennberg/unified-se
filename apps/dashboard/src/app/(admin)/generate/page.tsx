'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sparkles, Download, Save, Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface CompanyProfile {
  companyName: string;
  orgNumber: string;
  industry: string;
  size: string;
  description: string;
}

interface GenerateResult {
  profile: CompanyProfile;
  sieText: string;
  kpis: Record<string, number | null>;
  connectionId?: string;
  uploadId?: string;
  saved?: boolean;
}

const INDUSTRIES = [
  { value: '', label: 'AI väljer...' },
  { value: 'consulting', label: 'Konsulting' },
  { value: 'retail', label: 'Detaljhandel' },
  { value: 'manufacturing', label: 'Tillverkning' },
  { value: 'restaurant', label: 'Restaurang' },
  { value: 'construction', label: 'Bygg' },
  { value: 'saas', label: 'SaaS' },
  { value: 'healthcare', label: 'Sjukvård' },
  { value: 'transport', label: 'Transport' },
  { value: 'real_estate', label: 'Fastigheter' },
];

const SIZES = [
  { value: 'micro', label: 'Micro (1-3 anställda)' },
  { value: 'small', label: 'Liten (4-15 anställda)' },
  { value: 'medium', label: 'Medel (16-50 anställda)' },
];

const KPI_LABELS: Record<string, string> = {
  netSales: 'Nettoomsättning',
  netIncome: 'Årets resultat',
  grossMargin: 'Bruttomarginal',
  operatingMargin: 'Rörelsemarginal',
  netMargin: 'Nettomarginal',
  equityRatio: 'Soliditet',
  currentRatio: 'Balanslikviditet',
  totalAssets: 'Totala tillgångar',
  totalEquity: 'Eget kapital',
  cashAndBank: 'Kassa och bank',
  ebitda: 'EBITDA',
  roe: 'Avk. eget kapital',
};

function formatKPI(key: string, value: number | null): string {
  if (value == null) return '-';
  const isPercentage = [
    'grossMargin', 'operatingMargin', 'netMargin', 'equityRatio',
    'currentRatio', 'roe', 'roa',
  ].includes(key);
  if (isPercentage) return `${(value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function GenerateCompanyPage() {
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('small');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear() - 1);
  const [includePreviousYear, setIncludePreviousYear] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        size,
        fiscalYear,
        includePreviousYear,
      };
      if (industry) body.industry = industry;

      const res = await fetch('/api/proxy/generate/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Generation failed (${res.status})`);
      }

      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        size,
        fiscalYear,
        includePreviousYear,
      };
      if (industry) body.industry = industry;

      const res = await fetch('/api/proxy/generate/company/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }

      const saved = await res.json();
      setResult(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.sieText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = result.profile.companyName.replace(/[^a-zA-ZåäöÅÄÖ0-9]/g, '_');
    a.download = `${safeName}_${fiscalYear}.se`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.sieText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Company</h1>
        <p className="text-muted-foreground mt-1">
          Use AI to generate a realistic Swedish company with full accounting data as a SIE file.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company Size</label>
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fiscal Year</label>
              <Input
                type="number"
                min={2000}
                max={2099}
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="flex items-center gap-2 self-end pb-1">
              <input
                id="prevYear"
                type="checkbox"
                checked={includePreviousYear}
                onChange={(e) => setIncludePreviousYear(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="prevYear" className="text-sm font-medium">
                Include previous year
              </label>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Company
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Company Profile */}
          <Card>
            <CardHeader>
              <CardTitle>{result.profile.companyName}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Org. nummer</dt>
                  <dd className="font-medium">{result.profile.orgNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="font-medium capitalize">{result.profile.industry}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd className="font-medium capitalize">{result.profile.size}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="font-medium">{result.profile.description}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card>
            <CardHeader>
              <CardTitle>Financial KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(KPI_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold">
                      {formatKPI(key, result.kpis[key] ?? null)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SIE Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SIE File</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview && (
                <pre className="mb-4 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                  {result.sieText.split('\n').slice(0, 60).join('\n')}
                  {result.sieText.split('\n').length > 60 && '\n\n... (truncated)'}
                </pre>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download SIE
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving || result.saved === true}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : result.saved ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save to App
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
              </div>

              {result.saved && result.connectionId && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Saved as connection <code className="rounded bg-muted px-1">{result.connectionId}</code>.
                  View on the Dashboard.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
