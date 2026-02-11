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

export default function ConsentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consentId = params.consentId as string;

  const [consent, setConsent] = useState<ConsentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

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

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

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
              {consent.status === 1 ? (
                <ResourceBrowser api={apiClient} consentId={consentId} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Data Explorer is only available for accepted consents.
                </p>
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
