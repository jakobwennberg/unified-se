import type { CanonicalEntityRecord, EntityType } from '../../types/entity.js';
import type { FortnoxEntityConfig } from './config.js';
import { contentHash } from '../../utils/hash.js';

/**
 * Derive invoice status from Fortnox boolean flags.
 */
function deriveInvoiceStatus(raw: Record<string, unknown>): string {
  if (raw['Cancelled'] === true) return 'cancelled';
  if (raw['FullyPaid'] === true || raw['Balance'] === 0) return 'paid';
  if (raw['Booked'] === true) return 'booked';
  if (raw['Sent'] === true) return 'sent';
  return 'draft';
}

/**
 * Extract fiscal year from a date string (YYYY-MM-DD).
 * Returns the year portion, or null if not available.
 */
function extractFiscalYear(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const year = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

/**
 * Map a raw Fortnox API record to a CanonicalEntityRecord.
 */
export function mapFortnoxEntity(
  raw: Record<string, unknown>,
  entityType: EntityType,
  config: FortnoxEntityConfig,
): CanonicalEntityRecord {
  const externalId = String(raw[config.idField] ?? '');
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

  // Status: derive for invoices/supplier_invoices, use raw field otherwise
  let status: string | null = null;
  if (entityType === 'invoice' || entityType === 'supplier_invoice') {
    status = deriveInvoiceStatus(raw);
  } else if (config.statusField) {
    status = (raw[config.statusField] as string | null) ?? null;
  }

  const lastModified = config.lastModifiedField
    ? (raw[config.lastModifiedField] as string | null) ?? null
    : null;

  const fiscalYear = extractFiscalYear(documentDate);

  return {
    external_id: externalId,
    entity_type: entityType,
    provider: 'fortnox',
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
