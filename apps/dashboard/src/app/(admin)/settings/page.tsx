import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = await createServiceClient();
  const { data: tenant } = await db
    .from('tenants')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Your account details and plan information.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Name</dt>
              <dd>{tenant.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Email</dt>
              <dd>{tenant.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Plan</dt>
              <dd className="capitalize">{tenant.plan}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Tenant ID</dt>
              <dd className="font-mono text-xs">{tenant.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Limits</CardTitle>
          <CardDescription>API rate limits for your current plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Requests per minute</dt>
              <dd>{tenant.rate_limit_per_minute}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Requests per day</dt>
              <dd>{(tenant.rate_limit_per_day as number).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Max consents</dt>
              <dd>{tenant.max_consents}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
