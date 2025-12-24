
import { prisma } from '@/lib/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import authConfig from './auth.config';
import NextAuth from 'next-auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
})