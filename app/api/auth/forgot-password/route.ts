/**
 * Forgot Password API Route
 * 
 * Sends a password reset email to the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generatePasswordResetToken } from '@/lib/auth/email';
import { sendPasswordResetEmail } from '@/lib/auth/mailer';
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

    // Find user (don't reveal if user exists or not for security)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true, password: true },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('[ForgotPassword] User not found:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.',
      });
    }

    // Check if user has a password (OAuth-only users can't reset password)
    if (!user.password) {
      console.log('[ForgotPassword] User has no password (OAuth only):', user.id);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.',
      });
    }

    // Generate reset token
    const { token, expiresAt } = generatePasswordResetToken(normalizedEmail);
    const tokenHash = hash(token);

    // Store token in database
    await prisma.userPassword.update({
      where: { userId: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Get user's first name for personalization
    const firstName = user.profile?.firstName || user.name?.split(' ')[0] || 'User';

    // Send email
    const emailSent = await sendPasswordResetEmail(normalizedEmail, resetUrl, firstName);

    if (!emailSent) {
      console.error('[ForgotPassword] Failed to send email to:', normalizedEmail);
      // Still return success to prevent enumeration
    }

    console.log('[ForgotPassword] Reset email sent to:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

