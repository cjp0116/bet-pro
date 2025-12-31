/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of Prisma Client in development
 */

import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
// import { withAccelerate } from '@prisma/extension-accelerate';


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL  })
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
