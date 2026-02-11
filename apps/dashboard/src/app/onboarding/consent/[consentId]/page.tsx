'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
  briox: 'Briox',
  bokio: 'Bokio',
  bjornlunden: 'Bjorn Lunden',
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
  const [bokioApiToken, setBokioApiToken] = useState('');
  const [bokioCompanyId, setBokioCompanyId] = useState('');
  const [blCompanyKey, setBlCompanyKey] = useState('');

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
      const res = await fetch(
        `/api/proxy/api/v1/auth/${consent.provider}/url?state=${encodeURIComponent(state)}`,
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

  const handleBjornLundenConnect = async () => {
    if (!consent || !blCompanyKey.trim()) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/proxy/api/v1/auth/bjornlunden/callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: blCompanyKey.trim(),
            consentId,
            companyId: blCompanyKey.trim(),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to connect Björn Lunden');
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setAccepting(false);
    }
  };

  const handleBokioConnect = async () => {
    if (!consent || !bokioApiToken.trim() || !bokioCompanyId.trim()) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/proxy/api/v1/auth/bokio/callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: bokioApiToken.trim(),
            consentId,
            companyId: bokioCompanyId.trim(),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to connect Bokio');
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setAccepting(false);
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

            {consent.provider === 'briox' ? (
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
            ) : consent.provider === 'bokio' ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To connect Bokio, you need your Company ID and an API Token:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Log into your Bokio account</li>
                    <li>Find your <strong>Company ID</strong> in the Bokio URL &mdash; it&apos;s the ID after <code className="bg-muted px-1 rounded">app.bokio.se/</code></li>
                    <li>Go to Settings &rarr; API Tokens &rarr; Create Private Integration</li>
                    <li>Copy and paste the API Token below</li>
                  </ol>
                  <input
                    type="text"
                    placeholder="Company ID (e.g. 14ccad83-67f6-49bd-...)"
                    value={bokioCompanyId}
                    onChange={(e) => setBokioCompanyId(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Paste your API Token here"
                    value={bokioApiToken}
                    onChange={(e) => setBokioApiToken(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  onClick={handleBokioConnect}
                  disabled={accepting || !bokioApiToken.trim() || !bokioCompanyId.trim()}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {accepting ? 'Connecting...' : 'Connect'}
                </button>
              </>
            ) : consent.provider === 'bjornlunden' ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To connect Bj&ouml;rn Lund&eacute;n, you need your Company Key:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Log into your Bj&ouml;rn Lund&eacute;n account</li>
                    <li>Go to Integration Settings</li>
                    <li>Find the <strong>Company Key</strong> (GUID) for your company</li>
                    <li>Copy and paste it below</li>
                  </ol>
                  <input
                    type="text"
                    placeholder="Company Key (e.g. a1b2c3d4-e5f6-...)"
                    value={blCompanyKey}
                    onChange={(e) => setBlCompanyKey(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  onClick={handleBjornLundenConnect}
                  disabled={accepting || !blCompanyKey.trim()}
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
            <h2 className="text-xl font-semibold">Connected!</h2>
            <p className="text-sm text-muted-foreground">
              Your accounting system has been connected successfully.
            </p>
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
