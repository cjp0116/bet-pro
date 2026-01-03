/**
 * Authentication Input Validation Schemas
 */

import { z } from 'zod'

/**
 * Email validation - reusable
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email is too long')
  .transform((val) => val.toLowerCase().trim())

/**
 * Password validation with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password is too long')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain at least one number'
  )
  .refine(
    (val) => /[!@#$%^&*(),.?":{}|<>]/.test(val),
    'Password must contain at least one special character'
  )

/**
 * Basic password (no strength check - for login)
 */
export const basicPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password is too long')

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .max(100, 'Name is too long')
  .transform((val) => val.trim())
  .optional()

/**
 * Signup request schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
})

export type SignupInput = z.infer<typeof signupSchema>

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: basicPasswordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Forgot password request schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/**
 * Reset password request schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Resend verification email schema
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

/**
 * Validate reset token query param
 */
export const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export type ValidateTokenInput = z.infer<typeof validateTokenSchema>

