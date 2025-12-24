import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from "next-auth/providers/credentials"
import { Adapter } from 'next-auth/adapters';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
})