/**
 * Email sending service using Nodemailer
 */

import nodemailer from 'nodemailer';
import { generateVerificationEmailHtml, generatePasswordResetEmailHtml } from './email';

export type Transporter = nodemailer.Transporter | { sendMail: (options: nodemailer.SendMailOptions) => Promise<{ messageId: string }> };

// Cached transporter instance (lazy initialized)
let cachedTransporter: Transporter | null = null;

// Create transporter - configure based on environment
function createTransporter(): Transporter {
  // For production, use proper SMTP settings
  if (process.env.EMAIL_SERVER) {
    // Parse EMAIL_SERVER connection string
    // Format: smtp://user:pass@smtp.example.com:587
    return nodemailer.createTransport(process.env.EMAIL_SERVER);
  }

  // For development, use ethereal email or console logging
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Log emails to console in development
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log('\n========== EMAIL DEBUG ==========');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Preview URL would be sent here');
        console.log('HTML Preview:', options.html?.toString().substring(0, 200) + '...');
        console.log('=================================\n');
        return { messageId: 'dev-' + Date.now() };
      },
    } as nodemailer.Transporter;
  }

  throw new Error('EMAIL_SERVER environment variable is not configured');
}

/**
 * Get or create the transporter (lazy initialization)
 */
export function getTransporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
}

/**
 * Set a custom transporter (for testing)
 */
export function setTransporter(transporter: Transporter | null): void {
  cachedTransporter = transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const from = process.env.EMAIL_FROM || 'BetPro <noreply@betpro.com>';

    await getTransporter().sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    console.log(`[Mailer] Email sent successfully to ${options.to}`);
    return true;
  }
  catch (error) {
    console.error('[Mailer] Failed to send email:', {
      error: error instanceof Error ? error.message : String(error),
      to: options.to,
      subject: options.subject
    });
    throw error; // let the caller handle the error
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

