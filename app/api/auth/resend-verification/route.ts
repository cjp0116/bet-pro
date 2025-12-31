import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateEmailVerificationToken } from '@/lib/auth/email'
import { sendVerificationEmail } from '@/lib/email/resend'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Rate limit: 1 request per minute per email
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = resendSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = validationResult.data
    const normalizedEmail = email.toLowerCase()

    // Check rate limit
    const lastRequest = rateLimitMap.get(normalizedEmail)
    if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_WINDOW) {
      const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - lastRequest)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${waitTime} seconds before requesting another email` },
        { status: 429 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can sign in.',
        alreadyVerified: true,
      })
    }

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    })

    // Generate new verification token
    const verificationData = generateEmailVerificationToken(normalizedEmail)

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verificationData.token,
        expires: verificationData.expiresAt,
      },
    })

    // Get first name from profile or use name
    const firstName = user.profile?.firstName || user.name?.split(' ')[0] || 'there'

    // Send verification email
    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      verificationData.token,
      firstName
    )

    // Update rate limit
    rateLimitMap.set(normalizedEmail, Date.now())

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
