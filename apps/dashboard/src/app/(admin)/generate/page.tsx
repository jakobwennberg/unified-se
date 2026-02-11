'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sparkles, Download, Save, Copy, ChevronDown, ChevronUp, Loader2, Check, AlertTriangle } from 'lucide-react';

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
  adjustedEquity: 'Justerat eget kapital',
  cashAndBank: 'Kassa och bank',
  ebitda: 'EBITDA',
  roe: 'Avk. eget kapital',
};

function formatKPI(key: string, value: number | null): string {
  if (value == null) return '-';
  // KPIs already stored as percentages by calculateKPIs (e.g. 72.95 = 72.95%)
  const isAlreadyPercent = [
    'grossMargin', 'operatingMargin', 'netMargin', 'equityRatio',
    'roe', 'roa',
  ].includes(key);
  if (isAlreadyPercent) return `${value.toFixed(1)}%`;
  // Ratios that need * 100 to display as percentage (e.g. 1.527 → 152.7%)
  const isRatio = ['currentRatio'].includes(key);
  if (isRatio) return `${(value * 100).toFixed(1)}%`;
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

const GENERATION_STEPS = [
  { label: 'Förbereder prompt', delay: 0 },
  { label: 'AI genererar finansiell blueprint', delay: 2000 },
  { label: 'Bygger kontoplan', delay: 8000 },
  { label: 'Beräknar ingående balanser', delay: 14000 },
  { label: 'Genererar verifikationer', delay: 20000 },
  { label: 'Skriver SIE-fil', delay: 26000 },
  { label: 'Beräknar nyckeltal', delay: 30000 },
] as const;

const INDUSTRY_LABELS: Record<string, string> = {
  consulting: 'Konsulting',
  retail: 'Detaljhandel',
  manufacturing: 'Tillverkning',
  restaurant: 'Restaurang',
  construction: 'Bygg',
  saas: 'SaaS',
  healthcare: 'Sjukvård',
  transport: 'Transport',
  real_estate: 'Fastigheter',
};

const SIZE_LABELS: Record<string, string> = {
  micro: 'Micro (1-3 anställda)',
  small: 'Liten (4-15 anställda)',
  medium: 'Medel (16-50 anställda)',
};

function GenerationProgress({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(id);
  }, [startTime]);

  const currentStepIdx = GENERATION_STEPS.reduce(
    (acc, step, i) => (elapsed >= step.delay ? i : acc),
    0,
  );
  const progress = Math.min(
    95,
    (elapsed / 35000) * 100,
  );

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Genererar företag...</span>
              <span>{Math.floor(elapsed / 1000)}s</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {GENERATION_STEPS.map((step, i) => {
              const isComplete = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${
                    isComplete || isCurrent ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-gray-300" />
                  )}
                  <span className={isCurrent ? 'font-medium text-blue-900' : isComplete ? 'text-blue-700' : 'text-gray-500'}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
  const generationStartRef = useRef(0);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    generationStartRef.current = Date.now();
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
        throw new Error(data?.error ?? `Generering misslyckades (${res.status})`);
      }

      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel');
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
        throw new Error(data?.error ?? `Sparande misslyckades (${res.status})`);
      }

      const saved = await res.json();
      setResult(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel');
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
        <h1 className="text-2xl font-bold">Generera företag</h1>
        <p className="text-muted-foreground mt-1">
          Använd AI för att generera ett realistiskt svenskt företag med fullständig bokföring som SIE-fil.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Företagsinställningar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bransch</label>
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
              <label className="text-sm font-medium">Företagsstorlek</label>
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
              <label className="text-sm font-medium">Räkenskapsår</label>
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
                Inkludera föregående år
              </label>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generera företag
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

      {/* Generation Progress */}
      {loading && <GenerationProgress startTime={generationStartRef.current} />}

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
                  <dt className="text-muted-foreground">Bransch</dt>
                  <dd className="font-medium">{INDUSTRY_LABELS[result.profile.industry] ?? result.profile.industry}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Storlek</dt>
                  <dd className="font-medium">{SIZE_LABELS[result.profile.size] ?? result.profile.size}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <dt className="text-muted-foreground">Beskrivning</dt>
                  <dd className="font-medium">{result.profile.description}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card>
            <CardHeader>
              <CardTitle>Finansiella nyckeltal</CardTitle>
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

          {/* AI disclaimer */}
          <div
            className="flex items-start gap-2 rounded-md border p-3 text-sm"
            style={{ borderColor: '#fbbf24', backgroundColor: '#fefce8', color: '#92400e' }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Denna data är AI-genererad och avsedd för demonstrations- och testningsändamål.
              Nyckeltalen kan innehålla avvikelser och bör inte användas som underlag för verkliga beslut.
            </p>
          </div>

          {/* SIE Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SIE-fil</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      Dölj
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Förhandsgranska
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview && (
                <pre className="mb-4 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                  {result.sieText.split('\n').slice(0, 60).join('\n')}
                  {result.sieText.split('\n').length > 60 && '\n\n... (trunkerad)'}
                </pre>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Ladda ner SIE
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving || result.saved === true}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sparar...
                    </>
                  ) : result.saved ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Sparad
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Spara i appen
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Kopierad!' : 'Kopiera'}
                </Button>
              </div>

              {result.saved && result.connectionId && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Sparad som anslutning <code className="rounded bg-muted px-1">{result.connectionId}</code>.
                  Visa på Dashboard.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
