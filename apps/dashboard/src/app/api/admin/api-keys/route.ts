import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { randomBytes, createHash, createCipheriv, randomUUID } from 'node:crypto';

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function encryptKey(plaintext: string, encryptionKey: string): string {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service client to bypass RLS (policies use app.tenant_id, not auth.uid)
  const serviceClient = await createServiceClient();

  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { data: keys } = await serviceClient
    .from('api_keys')
    .select('id, name, key_prefix, expires_at, created_at, revoked_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ data: keys ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceClient();

  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const body = await request.json();
  const name = body.name || 'Default';
  const expiresInDays = body.expiresInDays as number | undefined;

  // Generate raw key
  const rawKey = 'ak_' + randomBytes(32).toString('hex');
  const keyPrefix = rawKey.substring(0, 10) + '...';
  const keyHash = hashApiKey(rawKey);

  // Encrypt for dashboard proxy use
  const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
  const encryptedKey = encryptionKey ? encryptKey(rawKey, encryptionKey) : null;

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { error: insertError } = await serviceClient
    .from('api_keys')
    .insert({
      id: randomUUID(),
      tenant_id: tenant.id,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      encrypted_key: encryptedKey,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update tenants.api_key_hash to newest key (for Hono API auth lookup)
  await serviceClient
    .from('tenants')
    .update({ api_key_hash: keyHash, updated_at: new Date().toISOString() })
    .eq('id', tenant.id);

  return NextResponse.json({
    key: rawKey,
    name,
    keyPrefix,
    expiresAt,
  });
}
