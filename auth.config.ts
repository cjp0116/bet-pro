import { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';

export default {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          include: { password: true, profile: true },
        });

        if (!user || !user.password?.passwordHash) {
          return null;
        }

        // Verify password - using bcrypt
        let bcrypt;
        try {
          bcrypt = await import('bcrypt');
        } catch {
          // bcrypt not available, check for plain text match (dev only)
          if (process.env.NODE_ENV === 'development' && password === user.password.passwordHash) {
            return {
              id: user.id,
              email: user.email,
              name: (user as any).name || user.profile?.firstName || user.email.split('@')[0],
            };
          }
          console.error('bcrypt not available for password verification');
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: (user as any).name || user.profile?.firstName || user.email.split('@')[0],
        };
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