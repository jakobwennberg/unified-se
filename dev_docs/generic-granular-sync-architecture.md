# Generic Granular Sync Architecture

## Context

Fortnox has a working granular sync that fetches 11 entity types (invoices, customers, suppliers, etc.) into `fortnox_entity_records`. The other 3 integrations (Visma, Bokio, BL) only fetch SIE files today. We want to add the same granular sync to all providers and make adding future providers trivial.

The core problem: the current sync logic, storage, progress tracking, and error handling are all hardcoded to Fortnox. We need to extract the provider-specific parts (API calls, pagination, field mapping) from the generic parts (orchestration, storage, progress).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Per-provider API routes (thin, ~30 lines each)         │
│  app/api/advisor/{provider}/sync-granular/route.ts      │
└───────────────────────┬─────────────────────────────────┘
                        │ calls
┌───────────────────────▼─────────────────────────────────┐
│  Generic Sync Engine (lib/services/granular-sync-engine) │
│  - iterates entity types                                 │
│  - manages progress, errors, batch IDs                   │
│  - reads/writes accounting_entity_records                │
│  - tracks sync state cursors                             │
└───────────────────────┬─────────────────────────────────┘
                        │ delegates fetching to
┌───────────────────────▼─────────────────────────────────┐
│  Provider Adapters (lib/adapters/{provider}-adapter.ts)  │
│  - implements AccountingProviderAdapter interface         │
│  - wraps existing client (fortnoxClient, vismaClient…)   │
│  - handles pagination, rate limiting, field mapping       │
│  - returns canonical CanonicalEntityRecord[]              │
└───────────────────────┬─────────────────────────────────┘
                        │ uses
┌───────────────────────▼─────────────────────────────────┐
│  Existing client libraries (lib/fortnox.ts, etc.)        │
│  - unchanged, just add fetchPaginatedList() to each      │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
NEW FILES:
  types/accounting-sync.ts                           # Shared types & adapter interface
  lib/adapters/fortnox-adapter.ts                    # Wraps fortnoxClient + ENTITY_CONFIGS
  lib/adapters/visma-adapter.ts                      # Wraps vismaClient
  lib/adapters/bokio-adapter.ts                      # Wraps bokioClient
  lib/adapters/bjornlunden-adapter.ts                # Wraps bjornLundenClient
  lib/adapters/index.ts                              # getAdapter() factory
  lib/services/granular-sync-engine.ts               # Generic orchestrator
  lib/db/supabase/accounting-entities.ts             # CRUD for generic tables
  app/api/advisor/visma/sync-granular/route.ts       # Thin route
  app/api/advisor/bokio/sync-granular/route.ts       # Thin route
  app/api/advisor/bjornlunden/sync-granular/route.ts # Thin route
  supabase/migrations/030_generic_granular_sync.sql  # New tables + data migration

MODIFIED FILES:
  app/api/advisor/fortnox/sync-granular/route.ts     # Refactor to use engine + adapter
  lib/visma.ts                                        # Add fetchPaginatedList()
  lib/bokio.ts                                        # Add fetchPaginatedList()
  lib/bjornlunden.ts                                  # Add fetchPaginatedList()
  app/api/advisor/visma/process-sie/route.ts          # Add fire-and-forget granular trigger
  app/api/advisor/bokio/process-sie/route.ts          # Add fire-and-forget granular trigger
  app/api/advisor/bjornlunden/process/route.ts        # Add fire-and-forget granular trigger

UNCHANGED:
  lib/fortnox.ts                                      # Existing client stays as-is
  lib/db/supabase/fortnox-entities.ts                 # Keep for backward compat during transition
  types/fortnox-granular.ts                           # Keep, adapter imports from it
```

## Key Design Decisions

### 1. Database: New generic tables (not rename existing)

Create `accounting_entity_records` and `accounting_sync_state` with an `integration` column. Don't FK to connection tables (they're provider-specific); use a CHECK constraint on `integration` instead. Connection IDs are globally unique so collisions aren't a concern.

Migrate existing Fortnox data with `INSERT INTO ... SELECT ... FROM fortnox_entity_records`. Both tables coexist during transition.

### 2. Adapter interface: normalization happens in the adapter

Each adapter maps provider-specific field names (Fortnox `DocumentNumber`, Visma `Id`, etc.) into a canonical `CanonicalEntityRecord`. The sync engine never touches provider-specific fields.

### 3. Sync engine: shared function, per-provider routes

A shared `executeGranularSync(adapter, connectionId, tenantId)` in `lib/services/`. Per-provider routes are thin (~30 lines) — instantiate adapter, update connection status, call engine.

### 4. Progress tracking: columns on each connection table

Add `granular_sync_*` columns to `visma_connections`, `bokio_connections`, `bl_connections` (Fortnox already has them). Matches the existing SIE processing pattern. No UI changes needed.

## Database Migration (`supabase/migrations/030_generic_granular_sync.sql`)

```sql
-- Generic entity records table
CREATE TABLE public.accounting_entity_records (
    record_id TEXT PRIMARY KEY,
    integration TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    external_id TEXT NOT NULL,
    fiscal_year INTEGER,
    document_date DATE,
    due_date DATE,
    counterparty_number TEXT,
    counterparty_name TEXT,
    amount DECIMAL(18, 2),
    currency TEXT DEFAULT 'SEK',
    status TEXT,
    raw_data JSONB NOT NULL,
    last_modified TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    sync_batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_accounting_entity UNIQUE (integration, connection_id, entity_type, external_id),
    CONSTRAINT chk_integration CHECK (integration IN ('fortnox','visma','bokio','bjornlunden'))
);

-- Generic sync state table
CREATE TABLE public.accounting_sync_state (
    sync_id TEXT PRIMARY KEY,
    integration TEXT NOT NULL,
    connection_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_modified_cursor TIMESTAMPTZ,
    records_fetched INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_accounting_sync_state UNIQUE (integration, connection_id, entity_type),
    CONSTRAINT chk_sync_integration CHECK (integration IN ('fortnox','visma','bokio','bjornlunden'))
);

-- Add granular_sync_* columns to other connection tables
ALTER TABLE visma_connections ADD COLUMN IF NOT EXISTS granular_sync_status TEXT DEFAULT 'pending';
ALTER TABLE visma_connections ADD COLUMN IF NOT EXISTS granular_sync_progress INTEGER DEFAULT 0;
ALTER TABLE visma_connections ADD COLUMN IF NOT EXISTS granular_sync_started_at TIMESTAMPTZ;
ALTER TABLE visma_connections ADD COLUMN IF NOT EXISTS granular_sync_completed_at TIMESTAMPTZ;
ALTER TABLE visma_connections ADD COLUMN IF NOT EXISTS granular_sync_error TEXT;

ALTER TABLE bokio_connections ADD COLUMN IF NOT EXISTS granular_sync_status TEXT DEFAULT 'pending';
ALTER TABLE bokio_connections ADD COLUMN IF NOT EXISTS granular_sync_progress INTEGER DEFAULT 0;
ALTER TABLE bokio_connections ADD COLUMN IF NOT EXISTS granular_sync_started_at TIMESTAMPTZ;
ALTER TABLE bokio_connections ADD COLUMN IF NOT EXISTS granular_sync_completed_at TIMESTAMPTZ;
ALTER TABLE bokio_connections ADD COLUMN IF NOT EXISTS granular_sync_error TEXT;

ALTER TABLE bl_connections ADD COLUMN IF NOT EXISTS granular_sync_status TEXT DEFAULT 'pending';
ALTER TABLE bl_connections ADD COLUMN IF NOT EXISTS granular_sync_progress INTEGER DEFAULT 0;
ALTER TABLE bl_connections ADD COLUMN IF NOT EXISTS granular_sync_started_at TIMESTAMPTZ;
ALTER TABLE bl_connections ADD COLUMN IF NOT EXISTS granular_sync_completed_at TIMESTAMPTZ;
ALTER TABLE bl_connections ADD COLUMN IF NOT EXISTS granular_sync_error TEXT;

-- Migrate existing Fortnox data
INSERT INTO accounting_entity_records (
    record_id, integration, connection_id, tenant_id,
    entity_type, external_id, fiscal_year, document_date, due_date,
    counterparty_number, counterparty_name, amount, currency, status,
    raw_data, last_modified, fetched_at, sync_batch_id, created_at, updated_at
)
SELECT
    record_id, 'fortnox', connection_id, tenant_id,
    entity_type, external_id, fiscal_year, document_date, due_date,
    counterparty_number, counterparty_name, amount, currency, status,
    raw_data, last_modified, fetched_at, sync_batch_id, created_at, updated_at
FROM fortnox_entity_records
ON CONFLICT DO NOTHING;

INSERT INTO accounting_sync_state (
    sync_id, integration, connection_id, entity_type,
    last_sync_at, last_modified_cursor, records_fetched, records_updated,
    last_error, last_error_at, created_at, updated_at
)
SELECT
    sync_id, 'fortnox', connection_id, entity_type,
    last_sync_at, last_modified_cursor, records_fetched, records_updated,
    last_error, last_error_at, created_at, updated_at
FROM fortnox_sync_state
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acct_entities_integration ON accounting_entity_records(integration);
CREATE INDEX IF NOT EXISTS idx_acct_entities_connection ON accounting_entity_records(connection_id);
CREATE INDEX IF NOT EXISTS idx_acct_entities_tenant ON accounting_entity_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acct_entities_type ON accounting_entity_records(entity_type);
CREATE INDEX IF NOT EXISTS idx_acct_entities_integration_conn_type ON accounting_entity_records(integration, connection_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_acct_entities_integration_conn_type_year ON accounting_entity_records(integration, connection_id, entity_type, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_acct_entities_document_date ON accounting_entity_records(document_date);
CREATE INDEX IF NOT EXISTS idx_acct_entities_raw_data ON accounting_entity_records USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_acct_sync_state_integration ON accounting_sync_state(integration);
CREATE INDEX IF NOT EXISTS idx_acct_sync_state_connection ON accounting_sync_state(connection_id);

-- RLS
ALTER TABLE accounting_entity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_accounting_entities" ON accounting_entity_records
    FOR ALL USING (tenant_id = ('user_' || auth.uid()::text))
    WITH CHECK (tenant_id = ('user_' || auth.uid()::text));

CREATE POLICY "service_role_bypass_accounting_entities" ON accounting_entity_records
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass_accounting_sync_state" ON accounting_sync_state
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER trigger_acct_entities_updated_at
    BEFORE UPDATE ON accounting_entity_records
    FOR EACH ROW EXECUTE FUNCTION update_financing_updated_at();

CREATE TRIGGER trigger_acct_sync_state_updated_at
    BEFORE UPDATE ON accounting_sync_state
    FOR EACH ROW EXECUTE FUNCTION update_financing_updated_at();
```

## Core Interface (`types/accounting-sync.ts`)

```typescript
export type IntegrationType = 'fortnox' | 'visma' | 'bokio' | 'bjornlunden';

export type AccountingEntityType =
  | 'invoice' | 'invoice_payment' | 'customer' | 'supplier'
  | 'supplier_invoice' | 'supplier_invoice_payment'
  | 'contract' | 'order' | 'employee' | 'asset' | 'company_info';

export interface CanonicalEntityRecord {
  external_id: string;
  entity_type: AccountingEntityType;
  fiscal_year: number | null;
  document_date: string | null;
  due_date: string | null;
  counterparty_number: string | null;
  counterparty_name: string | null;
  amount: number | null;
  currency: string;
  status: string | null;
  raw_data: Record<string, unknown>;
  last_modified: string | null;
}

export interface ProviderAuth {
  [key: string]: unknown;
}

export interface FetchOptions {
  lastModifiedCursor?: string;
  fromDate?: string;
  toDate?: string;
  fetchDetails?: boolean;
}

export interface AccountingProviderAdapter {
  readonly integration: IntegrationType;
  getAuthCredentials(connectionId: string): Promise<ProviderAuth>;
  getSupportedEntityTypes(connectionId: string): Promise<AccountingEntityType[]>;
  supportsIncrementalSync(entityType: AccountingEntityType): boolean;
  fetchEntities(
    auth: ProviderAuth,
    entityType: AccountingEntityType,
    options: FetchOptions,
    onProgress?: (page: number, totalPages: number) => void,
  ): Promise<CanonicalEntityRecord[]>;
}

export interface GranularSyncResult {
  syncBatchId: string;
  entityResults: EntitySyncResult[];
  totalTimeMs: number;
}

export interface EntitySyncResult {
  entity_type: AccountingEntityType;
  records_fetched: number;
  records_updated: number;
  success: boolean;
  error?: string;
}
```

## Sync Engine (`lib/services/granular-sync-engine.ts`)

Extracted from current `app/api/advisor/fortnox/sync-granular/route.ts`:

```typescript
export async function executeGranularSync(
  adapter: AccountingProviderAdapter,
  connectionId: string,
  tenantId: string,
  onProgress?: (processed: number, total: number) => Promise<void>,
): Promise<GranularSyncResult> {
  const auth = await adapter.getAuthCredentials(connectionId);
  const entityTypes = await adapter.getSupportedEntityTypes(connectionId);
  const batchId = generateSyncBatchId();

  // Date range: previous year + current year YTD
  const now = new Date();
  const fromDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];

  for (const entityType of entityTypes) {
    const cursor = await getAccountingSyncState(adapter.integration, connectionId, entityType);
    const records = await adapter.fetchEntities(auth, entityType, {
      lastModifiedCursor: cursor?.last_modified_cursor,
      fromDate,
      fetchDetails: true,
    });

    // Stamp each record with integration, connection_id, tenant_id, batch_id, record_id
    const dbRecords = records.map(r => ({
      record_id: generateRecordId(),
      integration: adapter.integration,
      connection_id: connectionId,
      tenant_id: tenantId,
      ...r,
      fetched_at: new Date().toISOString(),
      sync_batch_id: batchId,
    }));

    await upsertAccountingEntityRecords(dbRecords);
    await updateSyncStateSuccess(adapter.integration, connectionId, entityType, ...);
    await onProgress?.(processed, total);
  }
}
```

## Provider Adapter Example (Fortnox)

```typescript
// lib/adapters/fortnox-adapter.ts
// Wraps existing fortnoxClient + ENTITY_CONFIGS
// Field mapping extracted from current sync-granular/route.ts lines 136-218

export class FortnoxAdapter implements AccountingProviderAdapter {
  readonly integration = 'fortnox' as const;

  async getAuthCredentials(connectionId: string) {
    return { accessToken: await getValidAccessToken(connectionId) };
  }

  async getSupportedEntityTypes(connectionId: string) {
    const conn = await getFortnoxConnection(connectionId);
    const scopes = conn.granted_scopes || conn.scope?.split(' ') || [];
    return getAccessibleEntityTypes(scopes);
  }

  supportsIncrementalSync(entityType: AccountingEntityType): boolean {
    const config = ENTITY_CONFIGS[entityType as FortnoxEntityType];
    return config?.supportsLastModified ?? false;
  }

  async fetchEntities(auth, entityType, options, onProgress) {
    const entities = await fortnoxClient.fetchAllEntities(
      auth.accessToken, entityType, options, onProgress
    );
    return entities.map(e => this.toCanonical(e, entityType));
  }

  private toCanonical(entity, entityType): CanonicalEntityRecord {
    const config = ENTITY_CONFIGS[entityType];
    // Same extraction logic as current route (fiscal_year from dateField, etc.)
  }
}
```

## Per-Provider Route Example (Visma)

```typescript
// app/api/advisor/visma/sync-granular/route.ts (~30 lines)
export async function POST(req: Request) {
  const { connectionId, tenantId } = await req.json();
  const adapter = getAdapter('visma');

  await updateVismaConnection(connectionId, {
    granular_sync_status: 'processing', granular_sync_progress: 0,
    granular_sync_started_at: new Date().toISOString(), granular_sync_error: null,
  });

  const result = await executeGranularSync(adapter, connectionId, tenantId,
    async (processed, total) => {
      await updateVismaConnection(connectionId, {
        granular_sync_progress: Math.round((processed / total) * 100),
      });
    }
  );

  const failed = result.entityResults.filter(r => !r.success).length;
  await updateVismaConnection(connectionId, {
    granular_sync_status: failed === result.entityResults.length ? 'failed' : 'completed',
    granular_sync_progress: 100,
    granular_sync_completed_at: new Date().toISOString(),
    granular_sync_error: failed > 0 ? `${failed} entity types failed` : null,
  });

  return NextResponse.json({ success: true, ...result });
}
```

## Adding entity fetching to provider clients

Add a generic `fetchPaginatedList(accessToken, endpoint, params)` method to each client library. The adapter calls this per entity type with the right endpoint and maps the results.

- `lib/visma.ts`: `fetchPaginatedList()` with `$page`+`$pagesize`, `Meta.TotalNumberOfResults`
- `lib/bokio.ts`: `fetchPaginatedList()` with `items`+`totalPages` response shape
- `lib/bjornlunden.ts`: `fetchPaginatedList()` with BL-specific pagination

## Implementation Phases

### Phase 1: Foundation (no behavior change)
1. Create `types/accounting-sync.ts`
2. Create `supabase/migrations/030_generic_granular_sync.sql`
3. Create `lib/db/supabase/accounting-entities.ts`
4. Create `lib/services/granular-sync-engine.ts` (extract from Fortnox route)
5. Create `lib/adapters/fortnox-adapter.ts` + `lib/adapters/index.ts`
6. Refactor `app/api/advisor/fortnox/sync-granular/route.ts` to use engine + adapter
7. Verify Fortnox granular sync works identically

### Phase 2: Visma
1. Add `fetchPaginatedList()` + entity fetching to `lib/visma.ts`
2. Create `lib/adapters/visma-adapter.ts` with VISMA_ENTITY_CONFIGS
3. Create `app/api/advisor/visma/sync-granular/route.ts`
4. Add fire-and-forget trigger in Visma's process-sie route
5. Add granular status polling

### Phase 3: Bokio
Same pattern as Phase 2 for Bokio.

### Phase 4: Bjorn Lunden
Same pattern as Phase 2 for BL.

### Phase 5: Cleanup
1. Update consumers of `fortnox_entity_records` to read from `accounting_entity_records`
2. Drop old Fortnox-specific tables

## Cost to add a future provider

1. **One adapter file** (~150-200 lines) with entity configs + field mapping
2. **One route file** (~30 lines)
3. **Add one entry** to adapter factory + DB CHECK constraint
4. **Zero changes** to sync engine, DB layer, or existing adapters

## Verification

- After Phase 1: Run the Fortnox granular sync and verify records appear in `accounting_entity_records` with `integration = 'fortnox'`, identical to what was in `fortnox_entity_records`
- After Phase 2-4: Connect each provider, trigger granular sync, verify entity records stored correctly
- Check progress polling works in the UI for each provider
- Verify incremental sync: run twice, second run should fetch fewer/no records for providers that support `lastModified`
