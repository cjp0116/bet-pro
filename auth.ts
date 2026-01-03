import { prisma } from '@/lib/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from './auth.config';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/nodemailer';
import { logSignInAttempt, logSignOut } from './lib/auth/signin-logger';
import { sendVerificationEmail } from './lib/auth/mailer';
import { headers } from 'next/headers';


export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' }, // Use JWT for credentials provider compatibility
  ...authConfig,
  providers: [
    ...authConfig.providers,
    EmailProvider({
      // Using custom sendVerificationRequest with Resend API, server config not needed
      server: {} as any,
      from: process.env.EMAIL_FROM as string,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const user = await prisma.user.findUnique({
          where: { email: email },
          include: { profile: true },
        });

        // For magic link sign-in, extract token from NextAuth's URL and store hashed
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        const firstName = user?.profile?.firstName || user?.name?.split(' ')[0] || email.split('@')[0];

        if (!token) {
          console.error('[Auth EmailProvider] No token in URL:', url);
          throw new Error('Missing verification token');
        }

        // Hash once and reuse
        const { hash: hashFn } = await import('@/lib/security/encryption');
        const hashedToken = hashFn(token);

        // Store hashed token in database
        // Invalidate any existing tokens for this user
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Store hashed token in database
        await prisma.verificationToken.create({
          data: {
            identifier: email,
            token: hashedToken,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        // Use NextAuth's provided URL directly
        await sendVerificationEmail(email, url, firstName);
        console.log('[Auth EmailProvider] Verification email sent to:', email);
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      // Log OAuth sign-ins (Google, etc.) - runs AFTER user is persisted in DB
      if (account?.provider && account.provider !== 'credentials' && user.id && user.email) {
        try {
          const headersList = await headers();
          const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';
          const userAgent = headersList.get('user-agent') || '';

          await logSignInAttempt({
            userId: user.id,
            email: user.email,
            provider: account.provider,
            ip,
            userAgent,
            success: true,
          });
        } catch (error) {
          console.error('[Auth] Failed to log sign-in:', error);
        }
      }
    },
    async signOut(message) {
      // Log sign-out activity
      if ('token' in message && message.token?.id) {
        try {
          const headersList = await headers();
          const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';
          const userAgent = headersList.get('user-agent') || '';

          await logSignOut(message.token.id as string, ip, userAgent);
        } catch (error) {
          console.error('[Auth] Failed to log sign-out:', error);
        }
      }
    },
  },
});