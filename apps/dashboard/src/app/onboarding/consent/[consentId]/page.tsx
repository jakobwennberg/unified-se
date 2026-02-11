'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
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
