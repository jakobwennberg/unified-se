# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcim Sync (`@arcim-sync`) — a unified sync engine for Swedish accounting providers (Fortnox, Visma, Bokio, Bjorn Lunden). Supports granular entity sync (invoices, customers, suppliers, etc.), SIE file parsing, and a consent-based multi-tenant API.

## Commands

```bash
# Install dependencies
npm install

# Build all packages (Turborepo)
npm run build

# Run all tests
npm run test

# Type check
npm run typecheck

# Run a single package's tests
cd packages/core && npx vitest run
cd packages/server && npx vitest run

# Run a specific test file
npx vitest run packages/core/src/sync/e2e.test.ts

# Watch mode
cd packages/core && npx vitest

# Try-it demo server (mock provider, in-memory SQLite, no credentials needed)
npx tsx try-it.ts
# Then curl localhost:3456/health, etc. (see printed commands)

# Dev mode (watches all packages)
npm run dev
```

## Architecture

**Monorepo** using npm workspaces + Turborepo. Node >= 20. TypeScript strict mode with `noUncheckedIndexedAccess`. No ESLint/Prettier — linting is `tsc --noEmit`.

### Packages

- **`packages/core`** (`@arcim-sync/core`) — Pure TypeScript library. Provider interfaces, sync engine, SIE parser, database schema (Drizzle ORM), and utilities. Built with tsup (dual ESM + CJS). Secondary export `@arcim-sync/core/sie` for SIE-only usage.

- **`packages/server`** (`@arcim-sync/server`) — Hono REST API wrapping core. Route groups: `/connections`, `/sync`, `/entities`, `/sie`, `/auth`, `/providers`, and `/api/v1/consents` (consent-based multi-tenant API with typed resource routes like `/salesinvoices`, `/customers`). Built with tsup.

- **`packages/dashboard`** (`@arcim-sync/dashboard`) — React 19 component library (Tailwind 4, Vite). Components: `ConsentList`, `ConsentDetail`, `ResourceBrowser`, `OnboardingWizard`.

### Apps

- **`apps/dashboard`** — Next.js 15 admin dashboard with Supabase auth.
- **`apps/hosted`** — Supabase Edge Function entry point (Deno runtime, PostgresAdapter).
- **`apps/example`** — Docker-compose reference setup.

### Key Design Patterns

- **Credential-less library**: Consumers pass credentials on every call. The core package never stores tokens.
- **Two provider interfaces**: `AccountingProvider` (V1, in `providers/base.ts`) for sync-oriented usage, and `AccountingProviderV2` (in `providers/base-v2.ts`) adding typed DTOs and `ResourceCapabilities` for the consent-based V1 API.
- **Provider registry**: `registerProvider(name, factory)` / `getProvider(name)` in `providers/index.ts`.
- **Content-hash change detection**: `contentHash(data)` (SHA-256 of JSON) enables upsert without relying on provider `lastModified` fields.
- **Dual database support**: Drizzle ORM schema in `packages/core/src/db/schema.ts` (SQLite-based). `SQLiteAdapter` (in-memory for tests) and `PostgresAdapter` (production) both implement `DatabaseAdapter`.
- **Consent-based multi-tenancy**: V1 API routes (`/api/v1/consents/...`) use one-time codes + AES-256-GCM encrypted token storage. Consent middleware validates access before hitting provider APIs.

### Database Schema (core/src/db/schema.ts)

Tables: `connections`, `entity_records` (with content_hash + unique on connectionId/entityType/externalId), `sync_state`, `sync_progress`, `sie_uploads`, `sie_data`, `consents`, `consent_tokens`, `one_time_codes`.

### Documentation

- `dev_docs/` — Provider-specific implementation guides, SIE format specs, and architecture notes.
- `plan/PLAN.md` — Original architectural vision. Useful for understanding design rationale and the "adding a new provider" guide, but note: the implementation has evolved (npm not pnpm, different dashboard components, added V2 provider interface and consent API).
