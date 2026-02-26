import crypto from 'crypto';

/**
 * Field-level encryption for sensitive health data using AES-256-GCM.
 *
 * Encrypted fields to consider:
 *   - observations.rawReference  (raw lab/clinical text)
 *   - users.email                (PII)
 *
 * The encryption key is sourced from the ENCRYPTION_KEY environment variable.
 * It must be a 64-character hex string (32 bytes). In development, a fallback
 * key is used. In production, the env var is required.
 *
 * Encrypted output format: iv:authTag:ciphertext  (all hex-encoded)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production (64 hex chars = 32 bytes)');
  }

  const keyHex = envKey || 'a'.repeat(64); // dev-only fallback
  const keyBuffer = Buffer.from(keyHex, 'hex');

  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }

  return keyBuffer;
}

/**
 * Encrypt a plaintext string value using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (hex-encoded).
 */
export function encryptField(value: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value previously encrypted with encryptField().
 * Expects format: iv:authTag:ciphertext (hex-encoded).
 */
export function decryptField(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format (expected iv:authTag:ciphertext)');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check whether a string looks like it was encrypted by encryptField().
 * Useful for idempotent encrypt-on-write patterns.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // iv should be 32 hex chars, authTag 32 hex chars
  return parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2 && /^[0-9a-f]+$/.test(parts[0]);
}
