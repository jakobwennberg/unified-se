import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keyId: string }> },
) {
  const { keyId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Verify key belongs to tenant, then revoke
  const serviceClient = await createServiceClient();

  const { data: key } = await serviceClient
    .from('api_keys')
    .select('id, tenant_id')
    .eq('id', keyId)
    .eq('tenant_id', tenant.id)
    .single();

  if (!key) return NextResponse.json({ error: 'API key not found' }, { status: 404 });

  await serviceClient
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId);

  return NextResponse.json({ success: true });
}
