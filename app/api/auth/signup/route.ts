import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, checkPasswordStrength } from '@/lib/security/hashing';
import { hash, generateSecureToken } from '@/lib/security/encryption';
import {
  generateDeviceFingerprint,
  parseDeviceType,
  parseBrowser,
  parseOS,
} from '@/lib/security/device-fingerprint';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check password strength
    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.meetsRequirements) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordCheck.feedback },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

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

    // TODO: Send verification email
    // await sendVerificationEmail(normalizedEmail, result.verificationToken);
    console.log('[Signup] Verification token:', result.verificationToken); // Remove in production

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

