 Unified Swedish Accounting Sync Platform — Architecture Plan

 Context

 Arcim currently integrates with 4 Swedish bookkeeping providers (Fortnox, Visma, Bokio, Bjorn Lunden) through separate,
 provider-specific client libraries, API routes, and database tables. Only Fortnox has granular entity sync (invoices,
 customers, etc.); the others only fetch SIE files. The goal is to:

 1. Build a unified, provider-agnostic sync engine that works with all 4 providers
 2. Include SIE file parsing as a first-class sync mode (unique to Swedish accounting)
 3. Provide a monitoring dashboard so users can see what data has landed
 4. Open-source the result so anyone integrating with Swedish bookkeeping systems can use it
 5. Arcim then adopts the package as a dependency, replacing its current bespoke sync code

 This plan is informed by the Zuno universal bookkeeping API reference architecture and arcim's existing
 generic-granular-sync-architecture.md design document.

 ---
 Package Structure: Turborepo Monorepo

 Three packages in a single monorepo with clear dependency flow: dashboard → server → core.

 swedish-accounting-sync/              # Working name (TBD)
 ├── turbo.json                        # Build pipeline
 ├── package.json                      # pnpm workspaces
 ├── tsconfig.base.json
 │
 ├── packages/
 │   ├── core/                         # Pure TS library — no framework deps
 │   │   └── src/
 │   │       ├── types/                # Provider, entity, sync, DB interfaces
 │   │       ├── providers/            # One dir per provider
 │   │       │   ├── base.ts           # Abstract AccountingProvider
 │   │       │   ├── index.ts          # Factory: getProvider(name)
 │   │       │   ├── fortnox/          # client.ts, mapper.ts, config.ts
 │   │       │   ├── visma/
 │   │       │   ├── bokio/
 │   │       │   └── bjornlunden/
 │   │       ├── sie/                  # SIE parser pipeline (ported from arcim)
 │   │       │   ├── parser.ts         # ← lib/sie-parser.ts
 │   │       │   ├── encoding.ts       # ← lib/sie-encoding.ts
 │   │       │   ├── kpi.ts            # ← lib/sie-kpi-calculator.ts
 │   │       │   └── accounts.ts       # ← lib/swedish-account-ranges.ts
 │   │       ├── sync/                 # Sync engine, queue, hash, scheduler
 │   │       ├── db/                   # DatabaseAdapter interface + Postgres + SQLite
 │   │       └── utils/                # Rate limiter, retry, logger interface
 │   │
 │   ├── server/                       # Hono REST API over core
 │   │   └── src/
 │   │       ├── app.ts                # Hono app
 │   │       ├── routes/               # providers, connections, sync, entities, sie, health
 │   │       └── middleware/           # Auth (pluggable), error handling
 │   │
 │   └── dashboard/                    # React component library (Vite + Tailwind)
 │       └── src/
 │           ├── components/           # ConnectionList, SyncStatus, EntityExplorer, etc.
 │           ├── hooks/                # useConnections, useSyncStatus, useEntities
 │           └── api/                  # REST client for server
 │
 ├── apps/
 │   └── example/                      # Working example with docker-compose (Postgres)
 │
 └── docs/                             # Getting started, providers, SIE format, adding providers

 Technology Choices
 Concern: Monorepo
 Choice: Turborepo + pnpm
 Why: Industry standard, good caching
 ────────────────────────────────────────
 Concern: Server
 Choice: Hono
 Why: Runtime-agnostic (Node/Bun/CF Workers), built-in OpenAPI via @hono/zod-openapi, same as Zuno
 ────────────────────────────────────────
 Concern: Dashboard
 Choice: React + Vite + Tailwind
 Why: Embeddable components, matches arcim's stack
 ────────────────────────────────────────
 Concern: Database
 Choice: Drizzle ORM (Postgres + SQLite)
 Why: Type-safe, lightweight, supports both dialects from same schema. Postgres for production, SQLite for zero-config local
 dev
 ────────────────────────────────────────
 Concern: Validation
 Choice: Zod
 Why: Runtime + static types, pairs with Hono OpenAPI
 ────────────────────────────────────────
 Concern: Build
 Choice: tsup (libs), Vite (dashboard)
 Why: ESM + CJS dual output
 ────────────────────────────────────────
 Concern: Testing
 Choice: Vitest + msw
 Why: Fast, native ESM, HTTP mocking
 ---
 Core Provider Interface (Read-Only)

 The consumer provides credentials on each call — the package never stores tokens.

 interface AccountingProvider {
   readonly name: ProviderName;  // 'fortnox' | 'visma' | 'bokio' | 'bjornlunden'

   getCapabilities(): ProviderCapabilities;
   validateCredentials(credentials: ProviderCredentials): Promise<boolean>;
   getCompanyInfo(credentials: ProviderCredentials): Promise<CompanyInfo>;
   getFinancialYears(credentials: ProviderCredentials): Promise<FinancialYear[]>;

   // Granular entity sync
   fetchEntities(credentials, options: FetchEntitiesOptions): Promise<FetchEntitiesResult>;
   fetchAllEntities(credentials, options, onProgress?): Promise<CanonicalEntityRecord[]>;

   // SIE file sync
   fetchSIE(credentials, options: FetchSIEOptions): Promise<FetchSIEResult>;
 }

 ProviderCapabilities (Explicit Capability Model — lesson from Zuno)

 interface ProviderCapabilities {
   name: ProviderName;
   displayName: string;
   supportedEntityTypes: EntityType[];
   supportsSIE: boolean;
   sieTypes: (1 | 2 | 3 | 4)[];
   supportsIncrementalSync: boolean;
   incrementalSyncEntities: EntityType[];  // Which entities support lastModified
   authType: 'oauth2' | 'api_token' | 'client_credentials';
   rateLimits: { maxRequests: number; windowMs: number };
 }

 Canonical Entity Record (with content_hash — lesson from Zuno)

 interface CanonicalEntityRecord {
   external_id: string;
   entity_type: EntityType;
   provider: ProviderName;
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
   content_hash: string;  // SHA-256 of raw_data — enables change detection for all providers
 }

 Provider-Specific Entity Types
 ┌──────────────────┬───────────────────┬──────────────┬─────────┬─────────┐
 │   Entity Type    │      Fortnox      │    Visma     │  Bokio  │   BL    │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ invoice          │ Yes (incremental) │ Planned      │ Planned │ Planned │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ customer         │ Yes (incremental) │ Planned      │ -       │ -       │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ supplier         │ Yes (incremental) │ Planned      │ -       │ -       │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ supplier_invoice │ Yes (incremental) │ Planned      │ Planned │ Planned │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ company_info     │ Yes               │ Yes          │ Yes     │ Yes     │
 ├──────────────────┼───────────────────┼──────────────┼─────────┼─────────┤
 │ SIE export       │ Yes (types 1-4)   │ Yes (type 4) │ Yes     │ Yes     │
 └──────────────────┴───────────────────┴──────────────┴─────────┴─────────┘
 ---
 Sync Engine

 Generalized from arcim's app/api/advisor/fortnox/sync-granular/route.ts.

 Two Sync Modes

 1. Entity sync: Iterates entity types, fetches via provider API, normalizes to canonical records, upserts with hash-based
 change detection
 2. SIE sync: Fetches SIE files per financial year, decodes (CP437), parses, stores accounts/transactions/balances/KPIs

 Key Patterns (Lessons from Zuno)

 - Hash-based change detection: SHA-256(JSON.stringify(raw_data)) — works even when providers don't support lastModified (e.g.,
  Fortnox's invoice_payment, employee, asset)
 - Per-entity-type error isolation: One entity type failing doesn't block others
 - Progress tracking: Stored in DB, queryable by dashboard
 - Pluggable job queue: Default in-memory; consumers can provide BullMQ, database-backed, or Cloudflare Queues adapter

 SyncEngine API

 class SyncEngine {
   constructor(db: DatabaseAdapter, options?: { logger?: Logger })

   executeSync(job: SyncJob): Promise<SyncProgress>
   // SyncJob = { connectionId, provider, credentials, entityTypes?, includeSIE?, sieOptions? }
   // SyncProgress = { jobId, status, progress 0-100, entityResults[], sieResult?, error? }
 }

 ---
 Database Layer

 DatabaseAdapter Interface (DB-Agnostic)

 interface DatabaseAdapter {
   // Entity records
   upsertEntities(connectionId, entityType, entities[]): Promise<{ inserted, updated, unchanged }>
   getEntities(connectionId, entityType, options?): Promise<CanonicalEntityRecord[]>
   getEntityCount(connectionId, entityType?): Promise<number>

   // Sync state (cursors)
   getSyncState(connectionId, entityType): Promise<SyncState | null>
   updateSyncState(connectionId, entityType, update): Promise<void>

   // Sync progress (job tracking)
   upsertSyncProgress(progress): Promise<void>
   getSyncProgress(jobId): Promise<SyncProgress | null>
   getSyncHistory(connectionId, limit?): Promise<SyncProgress[]>

   // SIE data
   storeSIEData(connectionId, data): Promise<string>
   getSIEUploads(connectionId): Promise<SIEUpload[]>
   getSIEData(uploadId): Promise<SIEFullData | null>

   // Connections (metadata, not auth)
   upsertConnection(connection): Promise<void>
   getConnections(options?): Promise<ConnectionRecord[]>

   // Schema
   migrate(): Promise<void>
 }

 Two implementations ship with the package:
 - PostgresAdapter (via Drizzle) — for production
 - SQLiteAdapter (via Drizzle) — for local dev, zero-config getting started

 ---
 Server REST API (Hono)

 GET  /health
 GET  /providers                              # List all providers + capabilities
 GET  /providers/:name                        # Single provider detail

 POST /connections                            # Register connection metadata
 GET  /connections                            # List connections
 GET  /connections/:id                        # Detail + entity counts
 DELETE /connections/:id                      # Remove connection + data

 POST /sync                                   # Start sync job (credentials in body)
 GET  /sync/:jobId                            # Job progress
 GET  /connections/:id/history                # Sync history

 GET  /entities?connectionId=&type=&page=     # Query entities
 GET  /entities/:id                           # Entity detail

 GET  /connections/:id/sie                    # List SIE uploads
 GET  /sie/:uploadId                          # Full SIE data
 POST /sie/parse                              # Parse SIE without storing (utility)

 GET  /connections/:id/errors                 # Recent errors

 Credentials are passed in POST /sync body, never stored by the package. The consumer manages auth.

 ---
 Dashboard Components
 ┌────────────────────┬────────────────────────────────────────────────────────────────┐
 │     Component      │                             Shows                              │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <ConnectionList /> │ All providers, status badges, last sync time                   │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <SyncStatus />     │ Live progress bar for running sync                             │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <SyncHistory />    │ Past runs: records fetched, errors, duration                   │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <EntityExplorer /> │ Browse entities with filters (type, fiscal year, counterparty) │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <SIEViewer />      │ Parsed accounts, transactions, balances, KPIs                  │
 ├────────────────────┼────────────────────────────────────────────────────────────────┤
 │ <ErrorLog />       │ Errors by entity type with timestamps                          │
 └────────────────────┴────────────────────────────────────────────────────────────────┘
 Embeddable in arcim or any React app:

 import { SyncDashboard } from '@swedish-accounting-sync/dashboard';
 <SyncDashboard apiUrl="http://localhost:3456" />

 ---
 Migration Path: arcim Adopts the Package

 What Moves to the Package
 ┌────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
 │                           arcim file                           │                Package destination                │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ lib/sie-parser.ts                                              │ packages/core/src/sie/parser.ts                   │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ lib/sie-encoding.ts                                            │ packages/core/src/sie/encoding.ts                 │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ lib/sie-kpi-calculator.ts                                      │ packages/core/src/sie/kpi.ts                      │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ lib/swedish-account-ranges.ts                                  │ packages/core/src/sie/accounts.ts                 │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ HTTP client logic from lib/fortnox.ts                          │ packages/core/src/providers/fortnox/client.ts     │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ HTTP client logic from lib/visma.ts                            │ packages/core/src/providers/visma/client.ts       │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ HTTP client logic from lib/bokio.ts                            │ packages/core/src/providers/bokio/client.ts       │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ HTTP client logic from lib/bjornlunden.ts                      │ packages/core/src/providers/bjornlunden/client.ts │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ Entity configs from lib/fortnox.ts ENTITY_CONFIGS              │ packages/core/src/providers/fortnox/config.ts     │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ Types from types/fortnox-granular.ts                           │ Generalized into packages/core/src/types/         │
 ├────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
 │ Sync logic from app/api/advisor/fortnox/sync-granular/route.ts │ packages/core/src/sync/engine.ts                  │
 └────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
 What Stays in arcim

 - OAuth flows (connect/callback routes) — arcim-specific auth management
 - Connection tables with tokens (fortnox_connections, etc.) — arcim manages credentials
 - Supabase RLS policies — arcim's multi-tenant isolation
 - Advisor/client tenant model — arcim's business logic
 - All non-bookkeeping features (loan analysis, financing, etc.)

 arcim Integration Pattern

 // arcim creates a Supabase-backed DatabaseAdapter
 const db = new SupabaseAccountingAdapter(supabaseClient);
 const engine = new SyncEngine(db);

 // In API route:
 const provider = getProvider('fortnox');
 const credentials = await getCredentialsFromConnection(connectionId); // arcim's auth layer
 const result = await engine.executeSync({
   connectionId,
   provider: 'fortnox',
   credentials,
   includeSIE: true,
 });

 arcim's sync routes shrink from ~500 lines to ~30 lines each.

 ---
 Implementation Sequence

 Phase 1: Monorepo + Core Types + SIE Parser

 - Set up Turborepo skeleton, tsconfig, tsup, vitest
 - Port SIE parser/encoding/KPIs/accounts from arcim (remove arcim-specific imports)
 - Define all TypeScript types (provider, entity, sync, database interfaces)
 - Write SIE parser tests with fixture files

 Phase 2: Fortnox Provider + Sync Engine

 - Implement FortnoxProvider (client, mapper, config)
 - Implement DatabaseAdapter + SQLite adapter (for fast testing)
 - Implement SyncEngine (entity sync + SIE sync)
 - Hash-based change detection
 - Tests with recorded API responses

 Phase 3: Remaining Providers + PostgreSQL

 - VismaProvider, BokioProvider, BjornLundenProvider
 - PostgreSQL adapter
 - Integration tests

 Phase 4: Server + Dashboard

 - Hono server with REST endpoints + OpenAPI spec
 - Dashboard React components (ConnectionList, SyncStatus, EntityExplorer, SIEViewer)
 - Example app with docker-compose

 Phase 5: arcim Migration

 - arcim installs packages
 - Write Supabase DatabaseAdapter wrapper
 - Replace sync routes with thin wrappers calling the package
 - Database migration: fortnox_entity_records → package's entity_records
 - E2E verification

 ---
 Adding a New Provider (Extension Guide)

 Cost: ~150-200 lines, zero changes to engine or existing providers.

 1. Create packages/core/src/providers/{name}/ with 3 files:
   - client.ts — HTTP calls with rate limiting
   - mapper.ts — raw response → CanonicalEntityRecord
   - config.ts — entity type → endpoint/field mapping
 2. Implement AccountingProvider interface in index.ts
 3. Register in factory (packages/core/src/providers/index.ts)
 4. Add to ProviderName union type

 ---
 Verification

 - Unit tests: Run pnpm test in each package — SIE parser, provider mappers, hash function, sync engine with mock DB
 - Integration tests: packages/core tests with SQLite adapter — full sync cycle with recorded API responses
 - E2E: apps/example with docker-compose — PostgreSQL + Hono server + real (sandbox) API calls
 - Dashboard: Vite dev server with mock data + Storybook for component isolation
 - arcim migration: Run existing arcim test suite after replacing sync routes; verify entity counts match before/after