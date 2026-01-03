/**
 * Email sending service using Resend API
 */

import { Resend } from 'resend';
import { generateVerificationEmailHtml, generatePasswordResetEmailHtml } from './email';

// Lazy-initialized Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'BetPro <onboarding@resend.dev>';

  // In development without API key, log to console
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === 'development') {
    console.log('\n========== EMAIL DEBUG ==========');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML Preview:', options.html?.substring(0, 200) + '...');
    console.log('=================================\n');
    return true;
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('[Mailer] Resend API error:', error);
      throw new Error(error.message);
    }

    console.log(`[Mailer] Email sent successfully to ${options.to}, id: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('[Mailer] Failed to send email:', {
      error: error instanceof Error ? error.message : String(error),
      to: options.to,
      subject: options.subject,
    });
    throw error;
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  firstName: string
): Promise<boolean> {
  const html = generateVerificationEmailHtml(verificationUrl, firstName);

  return sendEmail({
    to: email,
    subject: 'Verify your email - BetPro',
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  firstName: string
): Promise<boolean> {
  const html = generatePasswordResetEmailHtml(resetUrl, firstName);

  return sendEmail({
    to: email,
    subject: 'Reset your password - BetPro',
    html,
  });
}
