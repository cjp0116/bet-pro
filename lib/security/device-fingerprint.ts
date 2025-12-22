import { hash } from './encryption'

/**
 * Device fingerprinting for security tracking
 * 
 * Creates a unique fingerprint based on device characteristics
 * Used to detect suspicious account activity and prevent fraud
 */

export interface DeviceInfo {
  userAgent?: string
  language?: string
  platform?: string
  screenResolution?: string
  timezone?: string
  cookieEnabled?: boolean
  doNotTrack?: string
  hardwareConcurrency?: number
  deviceMemory?: number
}

/**
 * Generate device fingerprint from available information
 * 
 * @param deviceInfo - Device information from client
 * @param ipAddress - IP address (will be hashed)
 * @returns SHA-256 hash of device fingerprint
 */
export function generateDeviceFingerprint(
  deviceInfo: DeviceInfo,
  ipAddress?: string
): string {
  // Combine all available device characteristics
  const components: string[] = []

  if (deviceInfo.userAgent) {
    components.push(`ua:${deviceInfo.userAgent}`)
  }

  if (deviceInfo.language) {
    components.push(`lang:${deviceInfo.language}`)
  }

  if (deviceInfo.platform) {
    components.push(`platform:${deviceInfo.platform}`)
  }

  if (deviceInfo.screenResolution) {
    components.push(`screen:${deviceInfo.screenResolution}`)
  }

  if (deviceInfo.timezone) {
    components.push(`tz:${deviceInfo.timezone}`)
  }

  if (deviceInfo.cookieEnabled !== undefined) {
    components.push(`cookies:${deviceInfo.cookieEnabled}`)
  }

  if (deviceInfo.hardwareConcurrency) {
    components.push(`cpu:${deviceInfo.hardwareConcurrency}`)
  }

  if (deviceInfo.deviceMemory) {
    components.push(`memory:${deviceInfo.deviceMemory}`)
  }

  // Add IP address if available (will be hashed separately in database)
  if (ipAddress) {
    components.push(`ip:${ipAddress}`)
  }

  // Create fingerprint string
  const fingerprintString = components.join('|')

  // Hash the fingerprint for privacy
  return hash(fingerprintString)
}

/**
 * Parse user agent to extract device type
 * 
 * @param userAgent - User agent string
 * @returns Device type (mobile, desktop, tablet)
 */
export function parseDeviceType(userAgent?: string): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (!userAgent) {
    return 'unknown'
  }

  const ua = userAgent.toLowerCase()

  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    // Check if it's a tablet
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet'
    }
    return 'mobile'
  }

  // Check for tablets
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet'
  }

  return 'desktop'
}

/**
 * Extract browser name from user agent
 * 
 * @param userAgent - User agent string
 * @returns Browser name
 */
export function parseBrowser(userAgent?: string): string {
  if (!userAgent) {
    return 'unknown'
  }

  const ua = userAgent.toLowerCase()

  if (ua.includes('chrome') && !ua.includes('edg')) {
    return 'Chrome'
  }
  if (ua.includes('firefox')) {
    return 'Firefox'
  }
  if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'Safari'
  }
  if (ua.includes('edg')) {
    return 'Edge'
  }
  if (ua.includes('opera') || ua.includes('opr')) {
    return 'Opera'
  }
  if (ua.includes('msie') || ua.includes('trident')) {
    return 'Internet Explorer'
  }

  return 'unknown'
}

/**
 * Extract OS from user agent
 * 
 * @param userAgent - User agent string
 * @returns OS name
 */
export function parseOS(userAgent?: string): string {
  if (!userAgent) {
    return 'unknown'
  }

  const ua = userAgent.toLowerCase()

  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10')) return 'Windows 10/11'
    if (ua.includes('windows nt 6.3')) return 'Windows 8.1'
    if (ua.includes('windows nt 6.2')) return 'Windows 8'
    if (ua.includes('windows nt 6.1')) return 'Windows 7'
    return 'Windows'
  }
  if (ua.includes('mac os x') || ua.includes('macintosh')) {
    return 'macOS'
  }
  if (ua.includes('linux')) {
    return 'Linux'
  }
  if (ua.includes('android')) {
    return 'Android'
  }
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'iOS'
  }

  return 'unknown'
}

/**
 * Check if device fingerprint matches known device
 * 
 * @param fingerprint - Current device fingerprint
 * @param knownFingerprints - Array of known device fingerprints for user
 * @returns True if fingerprint matches any known device
 */
export function isKnownDevice(
  fingerprint: string,
  knownFingerprints: string[]
): boolean {
  return knownFingerprints.includes(fingerprint)
}

/**
 * Calculate similarity score between two fingerprints
 * Useful for detecting device changes
 * 
 * @param fingerprint1 - First fingerprint
 * @param fingerprint2 - Second fingerprint
 * @returns Similarity score (0-1, where 1 is identical)
 */
export function calculateFingerprintSimilarity(
  fingerprint1: string,
  fingerprint2: string
): number {
  // For hashed fingerprints, we can only check exact match
  // In a real implementation, you might want to compare components before hashing
  return fingerprint1 === fingerprint2 ? 1 : 0
}

