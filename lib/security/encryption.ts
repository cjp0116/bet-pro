import crypto from 'crypto'

/**
 * Encryption utilities for sensitive data using AES-256-GCM
 * 
 * Security considerations:
 * - Uses AES-256-GCM for authenticated encryption
 * - Each encryption generates a unique IV (initialization vector)
 * - Includes authentication tag to prevent tampering
 * - Keys should be managed via AWS KMS, HashiCorp Vault, or similar
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 64 // 64 bytes for key derivation
const TAG_LENGTH = 16 // 16 bytes for authentication tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * In production, this should fetch from a key management service
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  // If key is hex-encoded, decode it; otherwise use directly
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  // Derive key from password using PBKDF2 (for development only)
  // In production, use a proper key management service
  return crypto.pbkdf2Sync(key, 'salt', 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * 
 * @param plaintext - The data to encrypt
 * @returns Encrypted data in format: iv:tag:encryptedData (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return plaintext
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const tag = cipher.getAuthTag()

  // Combine IV, tag, and encrypted data
  const combined = Buffer.concat([iv, tag, encrypted])

  return combined.toString('base64')
}

/**
 * Decrypts data encrypted with encrypt()
 * 
 * @param encryptedData - The encrypted data in format: iv:tag:encryptedData
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return encryptedData
  }

  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract IV, tag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Encrypts a field for database storage
 * Returns null if input is null/undefined
 */
export function encryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return encrypt(value)
}

/**
 * Decrypts a field from database storage
 * Returns null if input is null/undefined
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return decrypt(value)
}

/**
 * Hash data using SHA-256 (one-way hashing for IP addresses, device fingerprints)
 * 
 * @param data - The data to hash
 * @returns SHA-256 hash in hex format
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate a secure random token
 * 
 * @param length - Length of token in bytes (default: 32)
 * @returns Random token in hex format
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a secure random string for passwords, API keys, etc.
 * 
 * @param length - Length of string (default: 32)
 * @returns Random string
 */
export function generateSecureString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = crypto.randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length]
  }

  return result
}

