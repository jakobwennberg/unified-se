import { z } from 'zod';

export const EntityTypeSchema = z.enum([
  'invoice',
  'invoice_payment',
  'customer',
  'supplier',
  'supplier_invoice',
  'supplier_invoice_payment',
  'contract',
  'order',
  'employee',
  'asset',
  'company_info',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

/**
 * Provider-agnostic entity record.
 * Each provider adapter maps raw API responses to this canonical shape.
 * The content_hash enables change detection even when providers
 * don't support lastModified filtering.
 */
export interface CanonicalEntityRecord {
  external_id: string;
  entity_type: EntityType;
  provider: import('./provider.js').ProviderName;
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
  /** SHA-256 of JSON.stringify(raw_data) — enables change detection for all providers */
  content_hash: string;
}

export interface FetchEntitiesOptions {
  /** Resume from this cursor for incremental sync */
  lastModifiedCursor?: string;
  /** Only fetch entities from this date */
  fromDate?: string;
  /** Only fetch entities up to this date */
  toDate?: string;
  /** Fiscal year filter */
  fiscalYear?: number;
  /** Fetch detail records (slower but more data) */
  fetchDetails?: boolean;
  /** Page size for pagination */
  pageSize?: number;
}

export interface FetchEntitiesResult {
  entities: CanonicalEntityRecord[];
  /** Cursor for next incremental sync */
  nextCursor: string | null;
  /** Total records available (if known) */
  totalCount: number | null;
  /** Whether more pages exist */
  hasMore: boolean;
}

export interface FetchProgressCallback {
  (current: number, total: number, entityType: EntityType): void;
}
