'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface ApiKeyTableProps {
  keys: ApiKey[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeyTable({ keys, onRevoke }: ApiKeyTableProps) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    setRevoking(keyId);
    onRevoke(keyId);
    setRevoking(null);
  };

  if (keys.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        No API keys yet. Generate one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => {
          const isRevoked = !!key.revoked_at;
          const isExpired = key.expires_at && new Date(key.expires_at) < new Date();

          return (
            <TableRow key={key.id}>
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell className="font-mono text-sm">{key.key_prefix}</TableCell>
              <TableCell>
                {isRevoked ? (
                  <Badge variant="destructive">Revoked</Badge>
                ) : isExpired ? (
                  <Badge variant="warning">Expired</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
              </TableCell>
              <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {!isRevoked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
