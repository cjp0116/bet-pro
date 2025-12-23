/**
 * Email verification and password reset utilities
 */

import { generateSecureToken } from '../security/encryption'

// Token expiry times
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000 // 1 hour

export interface VerificationToken {
  token: string
  email: string
  expiresAt: Date
  type: 'email_verification' | 'password_reset'
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(email: string): VerificationToken {
  return {
    token: generateSecureToken(32),
    email,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY),
    type: 'email_verification'
  }
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(email: string): VerificationToken {
  return {
    token: generateSecureToken(32),
    email,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY),
    type: 'password_reset'
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmailHtml(
  verificationUrl: string,
  firstName: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email - BetPro</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="100%" style="max-width: 480px;" cellspacing="0" cellpadding="0" border="0">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: #0f0f17; font-weight: bold; font-size: 20px;">B</span>
                    </div>
                    <span style="color: #ffffff; font-size: 24px; font-weight: bold;">BetPro</span>
                  </div>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background-color: #1a1a24; border-radius: 16px; padding: 40px 32px;">
                  <h1 style="margin: 0 0 16px; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center;">
                    Verify your email
                  </h1>
                  <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 24px; text-align: center;">
                    Hi ${firstName},<br><br>
                    Thanks for signing up for BetPro! Please verify your email address by clicking the button below.
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px;">
                        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #0f0f17; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; line-height: 20px; text-align: center;">
                    This link will expire in 24 hours.
                  </p>
                  
                  <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 20px; text-align: center;">
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding-top: 32px; text-align: center;">
                  <p style="margin: 0; color: #71717a; font-size: 12px; line-height: 18px;">
                    © 2024 BetPro. All rights reserved.<br>
                    Must be 21+ to play. Please gamble responsibly.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmailHtml(
  resetUrl: string,
  firstName: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password - BetPro</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="100%" style="max-width: 480px;" cellspacing="0" cellpadding="0" border="0">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                      <span style="color: #0f0f17; font-weight: bold; font-size: 20px;">B</span>
                    </div>
                    <span style="color: #ffffff; font-size: 24px; font-weight: bold;">BetPro</span>
                  </div>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background-color: #1a1a24; border-radius: 16px; padding: 40px 32px;">
                  <h1 style="margin: 0 0 16px; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center;">
                    Reset your password
                  </h1>
                  <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 24px; text-align: center;">
                    Hi ${firstName},<br><br>
                    We received a request to reset your password. Click the button below to create a new password.
                  </p>
                  
                  <!-- Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #0f0f17; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; line-height: 20px; text-align: center;">
                    This link will expire in 1 hour.
                  </p>
                  
                  <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 20px; text-align: center;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding-top: 32px; text-align: center;">
                  <p style="margin: 0; color: #71717a; font-size: 12px; line-height: 18px;">
                    © 2024 BetPro. All rights reserved.<br>
                    Must be 21+ to play. Please gamble responsibly.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

