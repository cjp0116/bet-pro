import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, checkPasswordStrength } from '@/lib/security/hashing'
import { generateEmailVerificationToken } from '@/lib/auth/email'
import { sendVerificationEmail } from '@/lib/email/resend'
import { z } from 'zod'

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = signupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password } = validationResult.data

    // Check password strength
    const passwordStrength = checkPasswordStrength(password)
    if (!passwordStrength.meetsRequirements) {
      return NextResponse.json(
        { error: passwordStrength.feedback[0] },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        accounts: true,  // Check for OAuth accounts
        password: true,  // Check if password exists
      },
    })

    if (existingUser) {
      // Check if user signed up via OAuth (e.g., Google)
      const hasOAuthAccount = existingUser.accounts.length > 0
      
      if (hasOAuthAccount && existingUser.emailVerified) {
        // User has OAuth account - check if they also have a password
        if (existingUser.password) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 }
          )
        }
        
        // Allow adding password to existing OAuth account
        const passwordHash = await hashPassword(password)
        
        await prisma.userPassword.create({
          data: {
            userId: existingUser.id,
            passwordHash,
          },
        })

        // Update profile if not set
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId: existingUser.id },
        })

        if (!existingProfile) {
          await prisma.userProfile.create({
            data: {
              userId: existingUser.id,
              firstName,
              lastName,
            },
          })
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Password added to your account. You can now sign in with either Google or email/password.',
          },
          { status: 200 }
        )
      }

      // User has verified email account (not OAuth)
      if (existingUser.emailVerified) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      // Delete unverified user to allow re-registration
      await prisma.user.delete({
        where: { id: existingUser.id },
      })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        password: {
          create: {
            passwordHash,
          },
        },
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
    })

    // Generate verification token
    const verificationData = generateEmailVerificationToken(email.toLowerCase())

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: verificationData.token,
        expires: verificationData.expiresAt,
      },
    })

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email.toLowerCase(),
      verificationData.token,
      firstName
    )

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail registration, but log the error
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created. Please check your email to verify your account.',
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}
