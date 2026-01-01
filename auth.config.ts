import { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/nodemailer';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/hashing';
import { logSignInAttempt } from '@/lib/auth/signin-logger';
import { headers } from 'next/headers';
import { sendVerificationEmail } from '@/lib/auth/mailer';


// Helper to get request metadata
async function getRequestInfo() {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown';
    const userAgent = headersList.get('user-agent') || '';
    return { ip, userAgent };
  } catch {
    return { ip: 'unknown', userAgent: '' };
  }
}

export default {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return { role: profile.role ?? 'user', ...profile };
      }
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { ip, userAgent } = await getRequestInfo();

        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[Auth] Missing credentials');
            return null;
          }

          const email = credentials.email as string;
          const password = credentials.password as string;

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { password: true, profile: true },
          });

          if (!user) {
            console.log('[Auth] User not found:', email);
            return null;
          }

          if (!user.password?.passwordHash) {
            console.log('[Auth] User has no password record:', user.id);
            return null;
          }

          // Check if account is locked
          if (user.password.lockedUntil && user.password.lockedUntil > new Date()) {
            console.log('[Auth] Account is locked until:', user.password.lockedUntil);

            // Log failed attempt due to lock
            await logSignInAttempt({
              userId: user.id,
              email: user.email,
              provider: 'credentials',
              ip,
              userAgent,
              success: false,
              errorMessage: 'Account locked',
            });

            throw new Error('Account is temporarily locked. Please try again later.');
          }

          // Verify password
          const isValid = await verifyPassword(password, user.password.passwordHash);

          if (!isValid) {
            // Increment failed login attempts
            const failedAttempts = (user.password.failedLoginAttempts || 0) + 1;
            const maxAttempts = 5;
            const lockDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

            await prisma.userPassword.update({
              where: { userId: user.id },
              data: {
                failedLoginAttempts: failedAttempts,
                lockedUntil: failedAttempts >= maxAttempts
                  ? new Date(Date.now() + lockDuration)
                  : null,
              },
            });

            // Log failed attempt
            await logSignInAttempt({
              userId: user.id,
              email: user.email,
              provider: 'credentials',
              ip,
              userAgent,
              success: false,
              errorMessage: 'Invalid password',
            });

            console.log('[Auth] Invalid password for user:', email, `(attempt ${failedAttempts}/${maxAttempts})`);
            return null;
          }

          // Reset failed login attempts on successful login
          if (user.password.failedLoginAttempts > 0 || user.password.lockedUntil) {
            await prisma.userPassword.update({
              where: { userId: user.id },
              data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
              },
            });
          }

          // Log successful sign-in
          await logSignInAttempt({
            userId: user.id,
            email: user.email,
            provider: 'credentials',
            ip,
            userAgent,
            success: true,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.profile?.firstName || user.email.split('@')[0],
            image: user.image,
            role: user.profile?.role ?? 'user'
          };
        } catch (error) {
          console.error('[Auth] Error in credentials authorize:', error);
          // Re-throw to let NextAuth handle it
          if (error instanceof Error) {
            throw error;
          }
          return null;
        }
      },
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER as string,
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
        await prisma.verificationToken.upsert({
          where: { identifier_token: { identifier: email, token: hashedToken } },
          create: {
            identifier: email,
            token: hashedToken,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          update: {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        // Use NextAuth's provided URL directly
        await sendVerificationEmail(email, url, firstName);
        console.log('[Auth EmailProvider] Verification email sent to:', email);
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn() {
      // OAuth logging moved to events.signIn (runs AFTER user is persisted)
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'user';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;