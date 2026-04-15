/**
 * AES-256-GCM encryption for sensitive data at rest.
 * Uses PBKDF2 key derivation with deployment-specific salt.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 200000; // OWASP recommended minimum

// Derive a proper 256-bit key from the secret with deployment-specific salt
let _cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const secret = process.env.ENCRYPTION_KEY;
  const env = process.env.NODE_ENV || 'development';

  if (!secret || secret.length < 32) {
    if (env === 'production') {
      throw new Error('[SECURITY] ENCRYPTION_KEY must be at least 32 characters and separate from JWT_SECRET');
    }
    console.warn('[SECURITY] ENCRYPTION_KEY not set or too short — using fallback for development only.');
    _cachedKey = crypto.pbkdf2Sync('festosh-dev-encryption-key-DO-NOT-USE-IN-PROD', 'festosh-dev-salt', PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
    return _cachedKey;
  }

  // Use ENCRYPTION_KEY itself to derive a unique salt via HMAC (no hardcoded salt)
  const saltInput = process.env.ENCRYPTION_SALT || secret.slice(0, 16);
  const salt = crypto.createHmac('sha256', 'festosh-key-derivation-v2').update(saltInput).digest();

  _cachedKey = crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return _cachedKey;
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

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted string.
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or auth tag length');
  }

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
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(value.toLowerCase().trim()).digest('hex');
}
