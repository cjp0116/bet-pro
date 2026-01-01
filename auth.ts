import { prisma } from '@/lib/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from './auth.config';
import NextAuth from 'next-auth';
import { logSignOut } from './lib/auth/signin-logger';
import { headers } from 'next/headers';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' }, // Use JWT for credentials provider compatibility
  ...authConfig,
  events: {
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