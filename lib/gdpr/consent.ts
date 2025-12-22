/**
 * GDPR Consent Management
 * 
 * Handles user consent tracking and management for GDPR compliance
 */

export type ConsentType = 'marketing' | 'analytics' | 'cookies' | 'data_sharing' | 'essential'
export type ConsentStatus = 'granted' | 'denied' | 'withdrawn'
export type ConsentMethod = 'explicit' | 'implicit'

export interface ConsentRecord {
  userId: string
  consentType: ConsentType
  consentStatus: ConsentStatus
  consentMethod: ConsentMethod
  ipAddressHash?: string
  withdrawnAt?: Date
  createdAt: Date
}

/**
 * Check if user has given consent for a specific type
 */
export function hasConsent(
  consents: ConsentRecord[],
  consentType: ConsentType
): boolean {
  const consent = consents.find(c => c.consentType === consentType)
  return consent?.consentStatus === 'granted' && !consent.withdrawnAt
}

/**
 * Check if user has withdrawn consent
 */
export function hasWithdrawnConsent(
  consents: ConsentRecord[],
  consentType: ConsentType
): boolean {
  const consent = consents.find(c => c.consentType === consentType)
  return consent?.consentStatus === 'withdrawn' || !!consent?.withdrawnAt
}

/**
 * Get all active consents for a user
 */
export function getActiveConsents(consents: ConsentRecord[]): ConsentRecord[] {
  return consents.filter(
    c => c.consentStatus === 'granted' && !c.withdrawnAt
  )
}

/**
 * Get all withdrawn consents for a user
 */
export function getWithdrawnConsents(consents: ConsentRecord[]): ConsentRecord[] {
  return consents.filter(c => c.withdrawnAt !== null && c.withdrawnAt !== undefined)
}

/**
 * Validate consent requirements
 * Essential consents are always required
 */
export function validateConsentRequirements(
  consents: ConsentRecord[],
  requiredTypes: ConsentType[]
): {
  valid: boolean
  missing: ConsentType[]
} {
  const missing: ConsentType[] = []

  for (const type of requiredTypes) {
    if (!hasConsent(consents, type)) {
      missing.push(type)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

