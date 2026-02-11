'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ApiKeyTable } from '@/components/admin/api-key-table';
import { ApiKeyDialog } from '@/components/admin/api-key-dialog';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/admin/api-keys');
    const data = await res.json();
    setKeys(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRevoke = async (keyId: string) => {
    await fetch(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' });
    fetchKeys();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your API Keys</CardTitle>
          <CardDescription>
            Use API keys to authenticate requests to the Arcim Sync API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <ApiKeyTable keys={keys} onRevoke={handleRevoke} />
          )}
        </CardContent>
      </Card>

      <ApiKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchKeys}
      />
    </div>
  );
}
