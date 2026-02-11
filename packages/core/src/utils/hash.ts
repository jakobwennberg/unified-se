import { createHash } from 'node:crypto';

/**
 * Compute a SHA-256 hash of the given data object.
 * Used for content-based change detection: if the hash of raw_data
 * hasn't changed since last sync, the record can be skipped.
 *
 * The object is serialized with sorted keys for deterministic output.
 */
export function contentHash(data: Record<string, unknown>): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(serialized).digest('hex');
}
