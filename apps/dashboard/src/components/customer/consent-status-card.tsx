'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_VARIANTS: Record<number, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  0: 'warning',
  1: 'success',
  2: 'destructive',
  3: 'secondary',
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Created',
  1: 'Active',
  2: 'Revoked',
  3: 'Inactive',
};

const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
  bokio: 'Bokio',
  bjornlunden: 'Bjorn Lunden',
};

interface ConsentStatusCardProps {
  consent: {
    id: string;
    name: string;
    provider: string;
    company_name: string | null;
    org_number: string | null;
    status: number;
    etag: string;
    created_at: string;
  };
  onRevoked?: () => void;
}

export function ConsentStatusCard({ consent, onRevoked }: ConsentStatusCardProps) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this consent? This will disconnect your accounting system.')) return;

    setRevoking(true);
    try {
      const res = await fetch(`/api/proxy/api/v1/consents/${consent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': consent.etag,
        },
        body: JSON.stringify({ status: 2 }),
      });

      if (res.ok) {
        onRevoked?.();
      }
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Connection Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="font-medium">{PROVIDER_LABELS[consent.provider] ?? consent.provider}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Company</dt>
            <dd className="font-medium">{consent.company_name ?? consent.org_number ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={STATUS_VARIANTS[consent.status] ?? 'secondary'}>
                {STATUS_LABELS[consent.status] ?? 'Unknown'}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Connected</dt>
            <dd className="font-medium">{new Date(consent.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        {consent.status === 1 && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleRevoke}
            disabled={revoking}
          >
            {revoking ? 'Revoking...' : 'Revoke Connection'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
