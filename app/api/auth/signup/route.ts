import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/hashing';
import { hash, generateSecureToken } from '@/lib/security/encryption';
import {
  generateDeviceFingerprint,
  parseDeviceType,
  parseBrowser,
  parseOS,
} from '@/lib/security/device-fingerprint';
import { sendVerificationEmail } from '@/lib/auth/mailer';
import { parseBody, signupSchema } from '@/lib/input-validation';

export async function POST(req: NextRequest) {
  try {
    // Validate input with Zod
    const parsed = await parseBody(req, signupSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { email, password, firstName, lastName } = parsed.data;
    const normalizedEmail = email; // Already normalized by schema

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Get request metadata
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const ipHash = hash(ip);
    const deviceFingerprint = generateDeviceFingerprint({ userAgent }, ip);
    const deviceType = parseDeviceType(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOS(userAgent);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateSecureToken(32);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user and all related records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: firstName && lastName ? `${firstName} ${lastName}` : firstName || null,
          accountStatus: 'active',
          gdprConsentGiven: true, // They agreed to terms during signup
        },
      });

      // 2. Create Account (credentials type for NextAuth compatibility)
      await tx.account.create({
        data: {
          userId: user.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: user.id, // Use user ID as provider account ID for credentials
        },
      });

      // 3. Create UserProfile
      await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: firstName || null,
          lastName: lastName || null,
        },
      });

      // 4. Create UserPassword
      await tx.userPassword.create({
        data: {
          userId: user.id,
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });

      // 5. Create VerificationToken for email verification
      await tx.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: hash(verificationToken), // Store hashed token
          expires: verificationTokenExpires,
        },
      });

      // 6. Create UserSession (optional - will be created on first login)
      // For signup, we create a session token that expires in 7 days
      const sessionToken = generateSecureToken(32);
      const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await tx.userSession.create({
        data: {
          userId: user.id,
          token: sessionToken,
          deviceFingerprint,
          ipAddressHash: ipHash,
          userAgent,
          expiresAt: sessionExpires,
        },
      });

      // 7. Create AccountActivityLog
      await tx.accountActivityLog.create({
        data: {
          userId: user.id,
          activityType: 'signup',
          ipAddressHash: ipHash,
          deviceFingerprint,
          userAgent,
          success: true,
          metadata: {
            method: 'email',
            firstName,
            lastName,
          },
        },
      });

      // 8. Create DeviceRegistry
      await tx.deviceRegistry.create({
        data: {
          userId: user.id,
          deviceFingerprint,
          deviceType,
          os,
          browser,
          trusted: false, // Require verification to trust device
        },
      });

      // 9. Create or update IpAddress
      await tx.ipAddress.upsert({
        where: { ipAddressHash: ipHash },
        create: {
          ipAddressHash: ipHash,
          // In production, you'd use a GeoIP service to populate these
          country: null,
          region: null,
          city: null,
          isp: null,
          isVpn: false,
          isProxy: false,
          riskScore: 0,
        },
        update: {
          lastSeenAt: new Date(),
        },
      });

      // 10. Create GDPR consent records
      await tx.gdprConsent.createMany({
        data: [
          {
            userId: user.id,
            consentType: 'terms_of_service',
            consentStatus: 'granted',
            consentMethod: 'explicit',
            ipAddressHash: ipHash,
          },
          {
            userId: user.id,
            consentType: 'privacy_policy',
            consentStatus: 'granted',
            consentMethod: 'explicit',
            ipAddressHash: ipHash,
          },
        ],
      });

      return { user, verificationToken };
    });

    // Send verification email
    if (!process.env.NEXTAUTH_URL) {
      console.error('[Signup] NEXTAUTH_URL environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${result.verificationToken}`;
    const displayName = firstName || normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\d+$/, '').trim()

    const emailSent = await sendVerificationEmail(normalizedEmail, verificationUrl, displayName);

    if (!emailSent) {
      console.error('[Signup] Failed to send verification email to:', normalizedEmail);
      return NextResponse.json(
        { error: 'Account created but failed to send verification email. Please contact support.' },
        { status: 500 }
      );
    }

    console.log('[Signup] Verification email sent to:', normalizedEmail);
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: result.user.id,
    });


  } catch (error) {
    console.error('[Signup] Error:', error);

    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}

