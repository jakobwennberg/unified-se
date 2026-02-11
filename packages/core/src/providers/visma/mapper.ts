import type { CanonicalEntityRecord, EntityType } from '../../types/entity.js';
import type { VismaEntityConfig } from './config.js';
import { contentHash } from '../../utils/hash.js';

/**
 * Visma order status codes mapped to human-readable strings.
 */
const ORDER_STATUS_MAP: Record<number, string> = {
  0: 'draft',
  1: 'active',
  2: 'invoiced',
  3: 'expired',
};

/**
 * Derive invoice/supplier_invoice status from RemainingAmount.
 */
function deriveInvoiceStatus(raw: Record<string, unknown>): string {
  const remaining = raw['RemainingAmount'] as number | undefined;
  if (remaining === 0) return 'paid';
  if (remaining !== undefined && remaining > 0) return 'unpaid';
  return 'unknown';
}

/**
 * Extract fiscal year from a date string (YYYY-MM-DD).
 */
function extractFiscalYear(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

/**
 * Map a raw Visma API record to a CanonicalEntityRecord.
 */
export function mapVismaEntity(
  raw: Record<string, unknown>,
  entityType: EntityType,
  config: VismaEntityConfig,
): CanonicalEntityRecord {
  const rawId = raw[config.idField];
  const externalId = rawId !== null && rawId !== undefined ? String(rawId) : '';

  const documentDate = config.dateField
    ? (raw[config.dateField] as string | null) ?? null
    : null;
  const dueDate = config.dueDateField
    ? (raw[config.dueDateField] as string | null) ?? null
    : null;
  const counterpartyNumber = config.counterpartyNumberField
    ? (raw[config.counterpartyNumberField] as string | null) ?? null
    : null;
  const counterpartyName = config.counterpartyNameField
    ? (raw[config.counterpartyNameField] as string | null) ?? null
    : null;
  const amount = config.amountField
    ? (raw[config.amountField] as number | null) ?? null
    : null;
  const currency = config.currencyField
    ? (raw[config.currencyField] as string | null) ?? 'SEK'
    : 'SEK';

  // Status derivation
  let status: string | null = null;
  if (entityType === 'invoice' || entityType === 'supplier_invoice') {
    status = deriveInvoiceStatus(raw);
  } else if (entityType === 'order') {
    const statusCode = raw['Status'] as number | undefined;
    status = statusCode !== undefined
      ? ORDER_STATUS_MAP[statusCode] ?? `status_${statusCode}`
      : null;
  }

  // Last modified: Visma uses ChangedUtc for customers, ModifiedUtc for others
  const lastModified = config.modifiedField
    ? (raw[config.modifiedField] as string | null) ?? null
    : null;

  const fiscalYear = extractFiscalYear(documentDate);

  return {
    external_id: externalId,
    entity_type: entityType,
    provider: 'visma',
    fiscal_year: fiscalYear,
    document_date: documentDate,
    due_date: dueDate,
    counterparty_number: counterpartyNumber,
    counterparty_name: counterpartyName,
    amount,
    currency,
    status,
    raw_data: raw,
    last_modified: lastModified,
    content_hash: contentHash(raw),
  };
}
