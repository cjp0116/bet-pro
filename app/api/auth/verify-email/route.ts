/**
 * Email Verification API Route
 * 
 * Verifies user's email using token from verification link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hash } from '@/lib/security/encryption';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const tokenHash = hash(token);

    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        expires: {
          gt: new Date(), // Token hasn't expired
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({
        success: false,
        error: 'expired',
        message: 'Invalid or expired verification token',
      }, { status: 400 });
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      // Still clean up the token and log the activity
      await prisma.$transaction([
        prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: verificationToken.identifier,
              token: tokenHash,
            },
          },
        }),
        prisma.accountActivityLog.create({
          data: {
            userId: user.id,
            activityType: 'email_verified',
            ipAddressHash: hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'),
            success: true,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      }, { status: 200 });
    }
    // Update user's email verification status
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      }),
      // Delete the used token
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: tokenHash,
          },
        },
      }),
      // Log the activity
      prisma.accountActivityLog.create({
        data: {
          userId: user.id,
          activityType: 'email_verified',
          ipAddressHash: hash(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'),
          success: true,
        },
      }),
    ]);

    console.log('[VerifyEmail] Email verified for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  }
  catch (error) {
    console.error('[VerifyEmail] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

