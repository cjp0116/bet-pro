/**
 * Resend Verification Email API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateEmailVerificationToken } from '@/lib/auth/email';
import { sendVerificationEmail } from '@/lib/auth/mailer';
import { hash } from '@/lib/security/encryption';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    // Always return success to prevent enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link will be sent.',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified.',
      });
    }

    // Generate new verification token
    const { token, expiresAt } = generateEmailVerificationToken(normalizedEmail);
    const tokenHash = hash(token);

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Store new token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
        expires: expiresAt,
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Get user's first name
    const firstName = user.profile?.firstName || user.name?.split(' ')[0] || 'User';

    // Send email
    await sendVerificationEmail(normalizedEmail, verificationUrl, firstName);

    console.log('[ResendVerification] Verification email sent to:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully.',
    });
  } catch (error) {
    console.error('[ResendVerification] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

