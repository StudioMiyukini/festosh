/**
 * AES-256-GCM encryption for sensitive data at rest.
 * Used for encrypting PII fields like email, contact info in the database.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Derive a proper 256-bit key from the secret
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[SECURITY] ENCRYPTION_KEY or JWT_SECRET must be set for data encryption');
  }
  // Use PBKDF2 to derive a proper key from the secret
  return crypto.pbkdf2Sync(secret, 'festosh-salt-v1', 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns: base64 string in format iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + ciphertext for storage
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted string.
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, ciphertext] = encryptedData.split(':');

  if (!ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Hash a value for indexing (when you need to search by encrypted field).
 * Uses HMAC-SHA256 — deterministic but not reversible.
 */
export function hmacHash(value: string): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || '';
  return crypto.createHmac('sha256', secret).update(value.toLowerCase().trim()).digest('hex');
}
