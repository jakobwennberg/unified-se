import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { StatsCards } from '@/components/admin/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use service client to bypass RLS (policies use app.tenant_id, not auth.uid)
  const db = await createServiceClient();

  const { data: tenant } = await db
    .from('tenants')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Setting up your account... Please refresh in a moment.</p>
      </div>
    );
  }

  // Fetch stats
  const [consentsResult, activeResult, apiKeysResult, recentConsents] = await Promise.all([
    db.from('consents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    db.from('consents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 1),
    db.from('api_keys').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).is('revoked_at', null),
    db.from('consents').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <StatsCards
        totalConsents={consentsResult.count ?? 0}
        activeConsents={activeResult.count ?? 0}
        apiKeyCount={apiKeysResult.count ?? 0}
        plan={tenant.plan}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Consents</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentConsents.data?.length ? (
            <p className="text-sm text-muted-foreground">No consents yet. Create one from the Consents page.</p>
          ) : (
            <div className="space-y-3">
              {recentConsents.data.map((consent: Record<string, unknown>) => (
                <div key={consent.id as string} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{consent.name as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {consent.provider as string} &middot; {consent.company_name as string ?? consent.org_number as string ?? 'No company'}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[consent.status as number] ?? 'secondary'}>
                    {STATUS_LABELS[consent.status as number] ?? 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
