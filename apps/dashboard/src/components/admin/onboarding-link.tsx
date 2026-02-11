'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';

interface OnboardingLinkProps {
  consentId: string;
}

export function OnboardingLink({ consentId }: OnboardingLinkProps) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/proxy/api/v1/consents/${consentId}/otc`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to generate OTC');

      const data = await res.json();
      const baseUrl = window.location.origin;
      setLink(`${baseUrl}/onboarding/consent/${consentId}?otc=${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onboarding Link</CardTitle>
        <CardDescription>
          Generate a one-time link for your customer to connect their accounting system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {link ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted p-3 text-xs break-all">
              {link}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button onClick={generateLink} disabled={loading} variant="outline">
            <LinkIcon className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Onboarding Link'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
