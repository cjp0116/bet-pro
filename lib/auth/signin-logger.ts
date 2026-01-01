/**
 * Sign-in activity logger
 * 
 * Logs user sign-in activity to:
 * - AccountActivityLog (via audit logger)
 * - UserSession
 * - DeviceRegistry
 * - IpAddress
 * - LoginAttempt
 */

import { prisma } from '@/lib/db/prisma';
import { hash, generateSecureToken } from '@/lib/security/encryption';
import {
  generateDeviceFingerprint,
  parseDeviceType,
  parseBrowser,
  parseOS,
} from '@/lib/security/device-fingerprint';
import { logAccountActivity } from '@/lib/audit/logger';

export interface SignInContext {
  userId: string;
  email: string;
  provider: 'credentials' | 'google' | string;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log a sign-in attempt (successful or failed)
 */
export async function logSignInAttempt(context: SignInContext): Promise<void> {
  const { userId, email, provider, ip, userAgent, success, errorMessage } = context;

  const ipHash = hash(ip);
  const deviceFingerprint = generateDeviceFingerprint({ userAgent }, ip);
  const deviceType = parseDeviceType(userAgent);
  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);

  try {
    // 1. Log to AccountActivityLog using existing audit logger
    await logAccountActivity(
      userId,
      success ? 'login' : 'login_failed',
      ip,
      deviceFingerprint,
      undefined, // country - could be enriched with GeoIP
      undefined, // region
      undefined, // city
      userAgent,
      success,
      { provider, errorMessage: errorMessage || null }
    );

    // 2. Log to LoginAttempt for rate limiting / fraud detection
    await prisma.loginAttempt.create({
      data: {
        emailHash: hash(email.toLowerCase()),
        ipAddressHash: ipHash,
        success,
        deviceFingerprint,
        userId: success ? userId : null,
      },
    });

    // Only create session and device records for successful logins
    if (success) {
      await prisma.$transaction(async (tx) => {
        // 3. Create UserSession
        const sessionToken = generateSecureToken(32);
        const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await tx.userSession.create({
          data: {
            userId,
            token: sessionToken,
            deviceFingerprint,
            ipAddressHash: ipHash,
            userAgent,
            expiresAt: sessionExpires,
          },
        });

        // 4. Upsert DeviceRegistry
        await tx.deviceRegistry.upsert({
          where: {
            userId_deviceFingerprint: {
              userId,
              deviceFingerprint,
            },
          },
          create: {
            userId,
            deviceFingerprint,
            deviceType,
            os,
            browser,
            trusted: false,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
          update: {
            lastSeenAt: new Date(),
            os,
            browser,
          },
        });

        // 5. Upsert IpAddress
        await tx.ipAddress.upsert({
          where: { ipAddressHash: ipHash },
          create: {
            ipAddressHash: ipHash,
            country: null,
            region: null,
            city: null,
            isp: null,
            isVpn: false,
            isProxy: false,
            riskScore: 0,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
          update: {
            lastSeenAt: new Date(),
          },
        });
      });
    }

    console.log(`[SignInLogger] ${success ? 'Successful' : 'Failed'} sign-in logged for user ${userId} via ${provider}`);
  } catch (error) {
    // Don't throw - logging failure shouldn't break sign-in
    console.error('[SignInLogger] Failed to log sign-in activity:', error);
  }
}

/**
 * Log a sign-out event
 */
export async function logSignOut(
  userId: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const deviceFingerprint = generateDeviceFingerprint({ userAgent }, ip);

  try {
    // Log the sign-out activity using existing audit logger
    await logAccountActivity(
      userId,
      'logout',
      ip,
      deviceFingerprint,
      undefined,
      undefined,
      undefined,
      userAgent,
      true
    );

    // Revoke the user session for this device
    await prisma.userSession.updateMany({
      where: {
        userId,
        deviceFingerprint,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    console.log(`[SignInLogger] Sign-out logged for user ${userId}`);
  } catch (error) {
    console.error('[SignInLogger] Failed to log sign-out:', error);
  }
}

/**
 * Get request metadata from headers
 */
export function getRequestMetadata(headers: Headers): { ip: string; userAgent: string } {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown';
  const userAgent = headers.get('user-agent') || '';

  return { ip, userAgent };
}

