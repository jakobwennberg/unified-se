'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [consentId, setConsentId] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`OAuth denied: ${errorParam}`);
      setStatus('error');
      return;
    }

    if (!code || !state) {
      setError('Missing authorization code or state');
      setStatus('error');
      return;
    }

    // State format: provider:consentId
    const separatorIndex = state.indexOf(':');
    if (separatorIndex === -1) {
      setError('Invalid state parameter');
      setStatus('error');
      return;
    }

    const provider = state.substring(0, separatorIndex);
    const cId = state.substring(separatorIndex + 1);
    setConsentId(cId);

    async function exchangeCode() {
      try {
        const res = await fetch(`/api/proxy/api/v1/auth/${provider}/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, consentId: cId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Token exchange failed (${res.status})`);
        }

        setStatus('success');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setStatus('error');
      }
    }

    exchangeCode();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm space-y-6">
        {status === 'loading' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Connecting your accounting system...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Connection Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            {consentId && (
              <a
                href={`/onboarding/consent/${consentId}`}
                className="inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Try Again
              </a>
            )}
          </div>
        )}

        {status === 'success' && consentId && (
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
