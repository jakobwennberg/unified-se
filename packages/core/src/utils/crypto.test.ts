import { describe, it, expect } from 'vitest';
import { createAESEncryption } from './crypto.js';
import { randomBytes } from 'node:crypto';

/** Generate a valid 32-byte (64 hex char) key. */
function validKey(): string {
  return randomBytes(32).toString('hex');
}

describe('createAESEncryption', () => {
  it('encrypt then decrypt returns the original plaintext', () => {
    const enc = createAESEncryption(validKey());
    const plaintext = 'my-secret-oauth-token';

    const ciphertext = enc.encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);

    const decrypted = enc.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('different plaintexts produce different ciphertexts', () => {
    const enc = createAESEncryption(validKey());

    const c1 = enc.encrypt('token-aaa');
    const c2 = enc.encrypt('token-bbb');
    expect(c1).not.toBe(c2);
  });

  it('same plaintext encrypted twice produces different ciphertexts (random IV)', () => {
    const enc = createAESEncryption(validKey());
    const plaintext = 'same-value';

    const c1 = enc.encrypt(plaintext);
    const c2 = enc.encrypt(plaintext);
    expect(c1).not.toBe(c2);

    // Both should still decrypt to the same value
    expect(enc.decrypt(c1)).toBe(plaintext);
    expect(enc.decrypt(c2)).toBe(plaintext);
  });

  it('decrypting with a wrong key throws', () => {
    const key1 = validKey();
    const key2 = validKey();

    const enc1 = createAESEncryption(key1);
    const enc2 = createAESEncryption(key2);

    const ciphertext = enc1.encrypt('secret');

    expect(() => enc2.decrypt(ciphertext)).toThrow();
  });

  it('works with an empty string', () => {
    const enc = createAESEncryption(validKey());

    const ciphertext = enc.encrypt('');
    const decrypted = enc.decrypt(ciphertext);
    expect(decrypted).toBe('');
  });

  it('works with unicode content', () => {
    const enc = createAESEncryption(validKey());
    const plaintext = 'Hej varlden! Bokforing med svenska tecken: aao';

    const ciphertext = enc.encrypt(plaintext);
    const decrypted = enc.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('works with emoji and multi-byte characters', () => {
    const enc = createAESEncryption(validKey());
    const plaintext = 'Test data with emojis and kanji: \u{1F4B0}\u{1F512}\u{6F22}\u{5B57}';

    const ciphertext = enc.encrypt(plaintext);
    const decrypted = enc.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('throws if key is too short', () => {
    const shortKey = randomBytes(16).toString('hex'); // 16 bytes = 32 hex chars
    expect(() => createAESEncryption(shortKey)).toThrow(
      'Encryption key must be 64 hex characters (32 bytes) for AES-256-GCM',
    );
  });

  it('throws if key is too long', () => {
    const longKey = randomBytes(48).toString('hex'); // 48 bytes = 96 hex chars
    expect(() => createAESEncryption(longKey)).toThrow(
      'Encryption key must be 64 hex characters (32 bytes) for AES-256-GCM',
    );
  });

  it('throws if key is not valid hex', () => {
    // 64 chars but not hex — Buffer.from will produce fewer than 32 bytes
    const badKey = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
    expect(() => createAESEncryption(badKey)).toThrow();
  });
});
