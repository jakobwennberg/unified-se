import { eq } from 'drizzle-orm';
import type { TenantRecord, TenantLookupFn } from './api-key-auth.js';
import * as schema from '../db/schema-postgres.js';

/**
 * Create a tenant lookup function using the Postgres database.
 */
export function createTenantLookup(db: any): TenantLookupFn {
  return async (apiKeyHash: string): Promise<TenantRecord | null> => {
    const rows = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.apiKeyHash, apiKeyHash))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      plan: row.plan,
      rateLimitPerMinute: row.rateLimitPerMinute,
      rateLimitPerDay: row.rateLimitPerDay,
      maxConsents: row.maxConsents,
    };
  };
}
