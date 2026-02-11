'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ConsentStatusCard } from '@/components/customer/consent-status-card';

interface ConsentData {
  id: string;
  name: string;
  provider: string;
  company_name: string | null;
  org_number: string | null;
  status: number;
  etag: string;
  created_at: string;
}

export default function CustomerConsentPage() {
  const params = useParams();
  const consentId = params.consentId as string;

  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsent = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/api/v1/consents/${consentId}`);
      if (!res.ok) throw new Error('Consent not found');
      const data = await res.json();
      setConsent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load consent');
    } finally {
      setLoading(false);
    }
  }, [consentId]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}
      {consent && (
        <ConsentStatusCard
          consent={consent}
          onRevoked={fetchConsent}
        />
      )}
    </div>
  );
}
