import { describe, it, expect } from 'vitest';
import { contentHash } from './hash.js';

describe('contentHash', () => {
  it('produces consistent hashes for the same data', () => {
    const data = { name: 'Test AB', amount: 1000, currency: 'SEK' };
    const hash1 = contentHash(data);
    const hash2 = contentHash(data);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different data', () => {
    const hash1 = contentHash({ amount: 1000 });
    const hash2 = contentHash({ amount: 2000 });
    expect(hash1).not.toBe(hash2);
  });

  it('is order-independent (keys are sorted)', () => {
    const hash1 = contentHash({ b: 2, a: 1 });
    const hash2 = contentHash({ a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });

  it('produces a valid SHA-256 hex string', () => {
    const hash = contentHash({ test: true });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles empty objects', () => {
    const hash = contentHash({});
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles nested objects', () => {
    const data = {
      invoice: {
        lines: [{ amount: 100 }, { amount: 200 }],
      },
    };
    const hash = contentHash(data);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
