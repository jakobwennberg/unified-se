'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
  briox: 'Briox',
  bokio: 'Bokio',
  bjornlunden: 'Bjorn Lunden',
  'sie-upload': 'Manual SIE Upload',
};

const PROVIDER_SCOPES: Record<string, string> = {
  fortnox: 'companyinformation,bookkeeping,invoice,customer,supplier',
};

interface ConsentData {
  id: string;
  name: string;
  provider: string;
  company_name: string | null;
  status: number;
  etag: string;
}

export default function OnboardingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const consentId = params.consentId as string;
  const otcCode = searchParams.get('otc');

  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [applicationToken, setApplicationToken] = useState('');
  const [sieFiles, setSieFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    fileName: string;
    fiscalYear: number;
    sieType: number;
    accountCount: number;
    transactionCount: number;
    companyName: string;
  }> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConsent = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/api/v1/consents/${consentId}`);
      if (!res.ok) throw new Error('Consent not found or invalid link');
      const data = await res.json();
      setConsent(data);
      if (data.status === 1) setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load consent');
    } finally {
      setLoading(false);
    }
  }, [consentId]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  const handleAccept = async () => {
    if (!consent) return;
    setAccepting(true);
    setError(null);

    try {
      // Get the OAuth authorization URL from the gateway
      const state = `${consent.provider}:${consentId}`;
      const scopes = PROVIDER_SCOPES[consent.provider] ?? '';
      const params = new URLSearchParams({ state });
      if (scopes) params.set('scopes', scopes);
      const res = await fetch(
        `/api/proxy/api/v1/auth/${consent.provider}/url?${params.toString()}`,
      );

      if (!res.ok) throw new Error('Failed to get authorization URL');
      const data = await res.json();

      // Redirect browser to the provider's OAuth page
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setAccepting(false);
    }
  };

  const handleBrioxConnect = async () => {
    if (!consent || !applicationToken.trim()) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/proxy/api/v1/auth/briox/callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: applicationToken.trim(), consentId }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to connect Briox');
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setAccepting(false);
    }
  };

  const handleSieUpload = async () => {
    if (!consent || sieFiles.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of sieFiles) {
        formData.append('files', file);
      }

      const res = await fetch(
        `/api/proxy/api/v1/consents/${consentId}/sie-upload`,
        { method: 'POST', body: formData },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setUploadResults(data.uploads);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(se|si|sie)$/i.test(f.name),
    );
    if (dropped.length > 0) setSieFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSieFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = '';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm space-y-6">
        {loading && (
          <p className="text-center text-muted-foreground">Loading...</p>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {consent && !done && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold">Authorize Access</h1>
              <p className="text-sm text-muted-foreground">
                You have been invited to connect your{' '}
                <strong>{PROVIDER_LABELS[consent.provider] ?? consent.provider}</strong>{' '}
                accounting system.
              </p>
            </div>

            <div className="rounded-md border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consent</span>
                <span className="font-medium">{consent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">
                  {PROVIDER_LABELS[consent.provider] ?? consent.provider}
                </span>
              </div>
              {otcCode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification</span>
                  <span className="font-mono text-xs text-green-600">Valid</span>
                </div>
              )}
            </div>

            {consent.provider === 'sie-upload' ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Upload your SIE files (.se, .si, .sie) to share your accounting data.
                  </p>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 cursor-pointer transition-colors ${
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    <svg className="h-8 w-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-sm text-muted-foreground">
                      Drag & drop SIE files here, or click to browse
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">
                      .se, .si, .sie files accepted
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".se,.si,.sie"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {sieFiles.length > 0 && (
                    <div className="space-y-2">
                      {sieFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSieFiles((prev) => prev.filter((_, j) => j !== i));
                            }}
                            className="text-muted-foreground hover:text-destructive text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSieUpload}
                  disabled={uploading || sieFiles.length === 0}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : `Upload ${sieFiles.length} file${sieFiles.length !== 1 ? 's' : ''}`}
                </button>
              </>
            ) : consent.provider === 'briox' ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To connect Briox, you need to generate an Application Token:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Log into your Briox account</li>
                    <li>Go to Admin &rarr; Users</li>
                    <li>Click the gear icon next to your user</li>
                    <li>Click &quot;Application Token&quot; to generate a token</li>
                    <li>Copy and paste the token below</li>
                  </ol>
                  <input
                    type="text"
                    placeholder="Paste your Application Token here"
                    value={applicationToken}
                    onChange={(e) => setApplicationToken(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  onClick={handleBrioxConnect}
                  disabled={accepting || !applicationToken.trim()}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {accepting ? 'Connecting...' : 'Connect'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground text-center">
                  By clicking Accept, you authorize read access to your accounting data.
                  You can revoke this at any time.
                </p>

                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {accepting ? 'Accepting...' : 'Accept & Connect'}
                </button>
              </>
            )}
          </>
        )}

        {done && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">
              {uploadResults ? 'Upload Complete!' : 'Connected!'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {uploadResults
                ? 'Your SIE files have been processed successfully.'
                : 'Your accounting system has been connected successfully.'}
            </p>

            {uploadResults && (
              <div className="text-left space-y-2">
                {uploadResults.map((r, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                    <div className="font-medium">{r.fileName}</div>
                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                      {r.companyName && <span>Company: {r.companyName}</span>}
                      <span>Fiscal Year: {r.fiscalYear}</span>
                      <span>Accounts: {r.accountCount}</span>
                      <span>Transactions: {r.transactionCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <a
              href={`/customer/consent/${consentId}`}
              className="inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              View Connection Status
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
