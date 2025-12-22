import crypto from 'crypto'
import { promisify } from 'util'

/**
 * Password hashing utilities using bcrypt or argon2
 * 
 * For production, consider using argon2id which is more secure:
 * npm install argon2
 */

// Check if bcrypt is available, otherwise use Node's built-in crypto
let bcrypt: any = null
try {
  bcrypt = require('bcrypt')
} catch {
  // bcrypt not installed, will use crypto.pbkdf2 as fallback
}

const pbkdf2Async = promisify(crypto.pbkdf2)
const randomBytesAsync = promisify(crypto.randomBytes)

const SALT_LENGTH = 32
const ITERATIONS = 100000 // PBKDF2 iterations
const KEY_LENGTH = 64 // 64 bytes for SHA-512
const HASH_ALGORITHM = 'sha512'

/**
 * Hash a password using bcrypt (if available) or PBKDF2
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (bcrypt) {
    // Use bcrypt with cost factor 12 (good balance of security and performance)
    const saltRounds = 12
    return await bcrypt.hash(password, saltRounds)
  }

  // Fallback to PBKDF2 if bcrypt is not available
  const salt = await randomBytesAsync(SALT_LENGTH)
  const hash = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM)

  // Format: algorithm:iterations:salt:hash (all base64 encoded)
  return `pbkdf2:${ITERATIONS}:${salt.toString('base64')}:${hash.toString('base64')}`
}

/**
 * Verify a password against a hash
 * 
 * @param password - Plain text password
 * @param hash - Hashed password to verify against
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (bcrypt) {
    return await bcrypt.compare(password, hash)
  }

  // Handle PBKDF2 format
  if (hash.startsWith('pbkdf2:')) {
    const parts = hash.split(':')
    if (parts.length !== 4) {
      return false
    }

    const iterations = parseInt(parts[1], 10)
    const salt = Buffer.from(parts[2], 'base64')
    const storedHash = Buffer.from(parts[3], 'base64')

    const computedHash = await pbkdf2Async(password, salt, iterations, KEY_LENGTH, HASH_ALGORITHM)

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(storedHash, computedHash)
  }

  return false
}

/**
 * Generate password reset token
 * 
 * @returns Secure random token
 */
export async function generatePasswordResetToken(): Promise<string> {
  const token = await randomBytesAsync(32)
  return token.toString('hex')
}

/**
 * Hash password reset token for storage
 * 
 * @param token - Plain token
 * @returns Hashed token
 */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify password reset token
 * 
 * @param token - Plain token
 * @param hash - Hashed token from database
 * @returns True if token matches
 */
export function verifyResetToken(token: string, hash: string): boolean {
  const tokenHash = hashResetToken(token)
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash))
}

/**
 * Check password strength
 * 
 * @param password - Password to check
 * @returns Object with strength score and feedback
 */
export function checkPasswordStrength(password: string): {
  score: number // 0-4
  feedback: string[]
  meetsRequirements: boolean
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 12) {
    score++
  } else {
    feedback.push('Password should be at least 12 characters long')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++
  } else {
    feedback.push('Password should contain at least one lowercase letter')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++
  } else {
    feedback.push('Password should contain at least one uppercase letter')
  }

  // Number check
  if (/\d/.test(password)) {
    score++
  } else {
    feedback.push('Password should contain at least one number')
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++
  } else {
    feedback.push('Password should contain at least one special character')
  }

  const meetsRequirements = score >= 4 && password.length >= 12

  return {
    score,
    feedback: feedback.length > 0 ? feedback : ['Password meets all requirements'],
    meetsRequirements
  }
}

/**
 * Generate secure backup codes for 2FA
 * 
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup codes
 */
export async function generateBackupCodes(count: number = 10): Promise<string[]> {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = await randomBytesAsync(4) // 8 hex characters
    codes.push(code.toString('hex').toUpperCase())
  }
  return codes
}

/**
 * Hash backup codes for storage
 * 
 * @param codes - Array of backup codes
 * @returns Array of hashed codes
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code => hashResetToken(code.toLowerCase()))
}

/**
 * Verify backup code
 * 
 * @param code - Plain backup code
 * @param hashedCodes - Array of hashed codes from database
 * @returns True if code matches any hashed code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const codeHash = hashResetToken(code.toLowerCase())
  return hashedCodes.some(hashed =>
    crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hashed))
  )
}

