'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConsentFilters } from '@/components/admin/consent-filters';
import { Plus } from 'lucide-react';

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
  briox: 'Briox',
  bokio: 'Bokio',
  bjornlunden: 'Bjorn Lunden',
};

interface Consent {
  id: string;
  name: string;
  provider: string;
  company_name: string | null;
  org_number: string | null;
  status: number;
  created_at: string;
}

export default function ConsentsPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createProvider, setCreateProvider] = useState('fortnox');
  const [createOrgNumber, setCreateOrgNumber] = useState('');
  const [createCompanyName, setCreateCompanyName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    const res = await fetch('/api/proxy/api/v1/consents');
    if (res.ok) {
      const data = await res.json();
      setConsents(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError('Name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/proxy/api/v1/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          provider: createProvider,
          orgNumber: createOrgNumber.trim() || undefined,
          companyName: createCompanyName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create consent (${res.status})`);
      }
      const created = await res.json();
      setShowCreate(false);
      setCreateName('');
      setCreateOrgNumber('');
      setCreateCompanyName('');
      router.push(`/consents/${created.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return consents.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (provider && c.provider !== provider) return false;
      if (status !== '' && c.status !== parseInt(status)) return false;
      return true;
    });
  }, [consents, search, provider, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consents</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Consent
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)}>
          <DialogHeader>
            <DialogTitle>Create Consent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="e.g. Acme Corp Fortnox"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider *</label>
              <Select value={createProvider} onChange={(e) => setCreateProvider(e.target.value)}>
                <option value="fortnox">Fortnox</option>
                <option value="visma">Visma eEkonomi</option>
                <option value="briox">Briox</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                placeholder="Optional"
                value={createCompanyName}
                onChange={(e) => setCreateCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Org Number</label>
              <Input
                placeholder="Optional"
                value={createOrgNumber}
                onChange={(e) => setCreateOrgNumber(e.target.value)}
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsentFilters
        search={search}
        onSearchChange={setSearch}
        provider={provider}
        onProviderChange={setProvider}
        status={status}
        onStatusChange={setStatus}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtered.length} consent{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
              No consents found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((consent) => (
                  <TableRow
                    key={consent.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/consents/${consent.id}`)}
                  >
                    <TableCell className="font-medium">{consent.name}</TableCell>
                    <TableCell>{PROVIDER_LABELS[consent.provider] ?? consent.provider}</TableCell>
                    <TableCell>{consent.company_name ?? consent.org_number ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[consent.status] ?? 'secondary'}>
                        {STATUS_LABELS[consent.status] ?? 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(consent.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
