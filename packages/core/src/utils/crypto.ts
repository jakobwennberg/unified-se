import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Token encryption interface for encrypting/decrypting OAuth tokens at rest.
 */
export interface TokenEncryption {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

/**
 * AES-256-GCM encryption for token storage.
 * Format: base64(iv:authTag:ciphertext)
 */
export function createAESEncryption(key: string): TokenEncryption {
  // Key must be 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 64 hex characters (32 bytes) for AES-256-GCM');
  }

  return {
    encrypt(plaintext: string): string {
      const iv = randomBytes(12); // 96-bit IV for GCM
      const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      // Combine iv + authTag + encrypted into a single base64 string
      const combined = Buffer.concat([iv, authTag, encrypted]);
      return combined.toString('base64');
    },

    decrypt(ciphertext: string): string {
      const combined = Buffer.from(ciphertext, 'base64');

      const iv = combined.subarray(0, 12);
      const authTag = combined.subarray(12, 28);
      const encrypted = combined.subarray(28);

      const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    },
  };
}
