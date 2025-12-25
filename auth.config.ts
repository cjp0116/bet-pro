import { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from './lib/security/hashing';

export default {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
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

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.profile?.firstName || user.email.split('@')[0],
            image: user.image,
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
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;