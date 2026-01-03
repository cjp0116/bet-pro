/**
 * Reset Password API Route
 * 
 * Validates token and resets user's password
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword } from '@/lib/security/hashing';
import { hash } from '@/lib/security/encryption';
import { parseBody, parseQuery, resetPasswordSchema, validateTokenSchema } from '@/lib/input-validation';

export async function POST(req: NextRequest) {
  try {
    // Validate input with Zod
    const parsed = await parseBody(req, resetPasswordSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { token, password } = parsed.data;

    // Hash the token to compare with stored hash
    const tokenHash = hash(token);

    // Find user with valid reset token
    const userPassword = await prisma.userPassword.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: {
          gt: new Date(), // Token hasn't expired
        },
      },
      include: {
        user: true,
      },
    });

    if (!userPassword) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Get current password history
    const passwordHistory = (userPassword.passwordHistory as string[] | null) || [];
    const allPasswordHistory = [userPassword.passwordHash, ...passwordHistory];
    for (const oldHash of allPasswordHistory) {
      if (await verifyPassword(password, oldHash)) {
        return NextResponse.json(
          { error: 'Cannot reuse a recent password. Please choose a different password.' },
          { status: 400 }
        );
      }
    }
    // Add current password to history (keep last 5)
    const updatedHistory = [userPassword.passwordHash, ...passwordHistory].slice(0, 5);

    // Update password and clear reset token
    await prisma.$transaction([
      prisma.userPassword.update({
        where: { id: userPassword.id },
        data: {
          passwordHash: newPasswordHash,
          passwordHistory: updatedHistory,
          resetToken: null,
          resetTokenExpiresAt: null,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0, // Reset failed attempts
          lockedUntil: null, // Unlock account
        },
      }),
      prisma.accountActivityLog.create({
        data: {
          userId: userPassword.userId,
          activityType: 'password_reset',
          ipAddressHash: hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'),
          success: true,
          metadata: { method: 'email_reset' },
        },
      }),
    ]);

    console.log('[ResetPassword] Password reset successful for user:', userPassword.userId);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Validate reset token (GET request)
 */
export async function GET(req: NextRequest) {
  try {
    const parsed = parseQuery(req.nextUrl.searchParams, validateTokenSchema);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
    }

    const tokenHash = hash(parsed.data.token);

    const userPassword = await prisma.userPassword.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!userPassword) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired token',
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error('[ResetPassword] Validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

