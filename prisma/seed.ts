/**
 * Database Seed Script
 * 
 * Populates the database with demo data from lib files.
 * Run with: npx prisma db seed
 */

import { PrismaClient, Prisma } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import { promisify } from 'util';

const Decimal = Prisma.Decimal;

// Password hashing (copied from lib/security/hashing.ts to avoid import issues)
const pbkdf2Async = promisify(crypto.pbkdf2);
const randomBytesAsync = promisify(crypto.randomBytes);
const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const HASH_ALGORITHM = 'sha512';

async function hashPassword(password: string): Promise<string> {
  // Try to use bcrypt if available
  try {
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch {
    // Fallback to PBKDF2
    const salt = await randomBytesAsync(SALT_LENGTH);
    const hash = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM);
    return `pbkdf2:${ITERATIONS}:${salt.toString('base64')}:${hash.toString('base64')}`;
  }
}

// Create Prisma client for seeding
function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

// ============================================
// Demo Data (from lib files)
// ============================================

// Demo user
const DEMO_USER = {
  id: 'demo-user-001',
  name: 'John Doe',
  email: 'demo@betpro.com',
  emailVerified: new Date(),
  accountStatus: 'active',
  kycVerified: true,
  kycLevel: 'enhanced',
  gdprConsentGiven: true,
  marketingConsent: true,
  riskScore: 15,
};

const DEMO_PASSWORD = 'demo@betpro.com';

// Transactions from lib/user-data.ts
const transactions = [
  {
    id: 'txn-001',
    type: 'deposit',
    amount: 500,
    balance: 1750,
    description: 'Deposit via Visa ****4582',
    date: '2024-12-22T14:30:00Z',
    status: 'completed',
    method: 'Visa',
  },
  {
    id: 'txn-002',
    type: 'bet_won',
    amount: 182.5,
    balance: 1250,
    description: 'Won: Chiefs -3.5 vs Bills',
    date: '2024-12-21T22:15:00Z',
    status: 'completed',
  },
  {
    id: 'txn-003',
    type: 'bet_placed',
    amount: -100,
    balance: 1067.5,
    description: 'Bet: Lakers vs Celtics - Lakers ML',
    date: '2024-12-21T19:45:00Z',
    status: 'completed',
  },
  {
    id: 'txn-004',
    type: 'bet_lost',
    amount: -75,
    balance: 1167.5,
    description: 'Lost: Warriors -4.5 vs Suns',
    date: '2024-12-20T23:30:00Z',
    status: 'completed',
  },
  {
    id: 'txn-005',
    type: 'bonus',
    amount: 50,
    balance: 1242.5,
    description: 'Welcome Bonus - First Deposit Match',
    date: '2024-12-20T10:00:00Z',
    status: 'completed',
  },
  {
    id: 'txn-006',
    type: 'withdrawal',
    amount: -200,
    balance: 1192.5,
    description: 'Withdrawal to Bank ****7891',
    date: '2024-12-19T16:20:00Z',
    status: 'completed',
    method: 'Bank Transfer',
  },
  {
    id: 'txn-007',
    type: 'deposit',
    amount: 300,
    balance: 1392.5,
    description: 'Deposit via PayPal',
    date: '2024-12-18T09:15:00Z',
    status: 'completed',
    method: 'PayPal',
  },
  {
    id: 'txn-008',
    type: 'bet_won',
    amount: 275,
    balance: 1092.5,
    description: 'Won: 3-Leg Parlay (NFL)',
    date: '2024-12-17T23:45:00Z',
    status: 'completed',
  },
  {
    id: 'txn-009',
    type: 'withdrawal',
    amount: -150,
    balance: 817.5,
    description: 'Withdrawal to Visa ****4582',
    date: '2024-12-16T11:30:00Z',
    status: 'pending',
    method: 'Visa',
  },
];

// User bets from lib/user-data.ts
const userBets = [
  {
    id: 'bet-001',
    type: 'single',
    status: 'pending',
    stake: 100,
    potentialWin: 190.91,
    placedAt: '2024-12-22T15:30:00Z',
  },
  {
    id: 'bet-002',
    type: 'parlay',
    status: 'pending',
    stake: 50,
    potentialWin: 364.5,
    placedAt: '2024-12-22T14:00:00Z',
  },
  {
    id: 'bet-003',
    type: 'single',
    status: 'won',
    stake: 75,
    potentialWin: 182.5,
    actualWin: 182.5,
    placedAt: '2024-12-21T18:00:00Z',
    settledAt: '2024-12-21T22:15:00Z',
  },
  {
    id: 'bet-004',
    type: 'single',
    status: 'lost',
    stake: 100,
    potentialWin: 195.45,
    placedAt: '2024-12-20T20:30:00Z',
    settledAt: '2024-12-20T23:30:00Z',
  },
  {
    id: 'bet-005',
    type: 'parlay',
    status: 'won',
    stake: 25,
    potentialWin: 275,
    actualWin: 275,
    placedAt: '2024-12-17T12:00:00Z',
    settledAt: '2024-12-17T23:45:00Z',
  },
  {
    id: 'bet-006',
    type: 'single',
    status: 'lost',
    stake: 50,
    potentialWin: 140,
    placedAt: '2024-12-15T14:00:00Z',
    settledAt: '2024-12-15T17:00:00Z',
  },
];

// Notifications from lib/notifications.ts
const notifications = [
  {
    id: 'notif-001',
    type: 'bet_won',
    priority: 'high',
    title: 'Bet Won!',
    message: 'Your 3-leg parlay on NFL games won! +$275.00',
    timestamp: '2024-12-22T18:30:00Z',
    read: false,
    dismissed: false,
    actionUrl: '/my-bets?id=bet-005',
    actionLabel: 'View Bet',
    metadata: { betId: 'bet-005', amount: 275 },
  },
  {
    id: 'notif-002',
    type: 'deposit',
    priority: 'normal',
    title: 'Deposit Successful',
    message: 'Your deposit of $500.00 via Visa has been processed.',
    timestamp: '2024-12-22T14:30:00Z',
    read: false,
    dismissed: false,
    actionUrl: '/transactions?id=txn-001',
    actionLabel: 'View Transaction',
    metadata: { transactionId: 'txn-001', amount: 500 },
  },
  {
    id: 'notif-003',
    type: 'promotion',
    priority: 'normal',
    title: 'New Bonus Available!',
    message: 'Get a 50% deposit match up to $200. Deposit now to claim!',
    timestamp: '2024-12-22T10:00:00Z',
    read: false,
    dismissed: false,
    actionUrl: '/deposit',
    actionLabel: 'Deposit Now',
  },
  {
    id: 'notif-004',
    type: 'bet_lost',
    priority: 'normal',
    title: 'Bet Settled',
    message: 'Your bet on Warriors -4.5 vs Suns did not win.',
    timestamp: '2024-12-21T23:30:00Z',
    read: true,
    dismissed: false,
    actionUrl: '/my-bets?id=bet-004',
    actionLabel: 'View Details',
    metadata: { betId: 'bet-004' },
  },
  {
    id: 'notif-005',
    type: 'withdrawal',
    priority: 'normal',
    title: 'Withdrawal Processing',
    message: 'Your withdrawal of $150.00 is being processed. Est. 2-3 business days.',
    timestamp: '2024-12-21T16:20:00Z',
    read: true,
    dismissed: false,
    actionUrl: '/transactions?id=txn-009',
    actionLabel: 'View Status',
    metadata: { transactionId: 'txn-009', amount: 150 },
  },
  {
    id: 'notif-006',
    type: 'bet_pending',
    priority: 'low',
    title: 'Bet Placed',
    message: 'Your bet on Chiefs -3.5 is confirmed and pending.',
    timestamp: '2024-12-21T15:30:00Z',
    read: true,
    dismissed: false,
    actionUrl: '/my-bets?id=bet-001',
    actionLabel: 'Track Bet',
    metadata: { betId: 'bet-001' },
  },
  {
    id: 'notif-007',
    type: 'account',
    priority: 'high',
    title: 'Verify Your Account',
    message: 'Complete identity verification to increase your withdrawal limits.',
    timestamp: '2024-12-20T09:00:00Z',
    read: true,
    dismissed: false,
    actionUrl: '/account?tab=verification',
    actionLabel: 'Verify Now',
  },
  {
    id: 'notif-008',
    type: 'system',
    priority: 'normal',
    title: 'Scheduled Maintenance',
    message: 'BetPro will undergo maintenance on Dec 25th from 2-4 AM EST.',
    timestamp: '2024-12-19T12:00:00Z',
    read: true,
    dismissed: true,
  },
];

// Featured games from lib/betting-data.ts
const featuredGames = [
  {
    id: 'game-1',
    sportKey: 'americanfootball_nfl',
    homeTeam: 'Kansas City Chiefs',
    awayTeam: 'Buffalo Bills',
    commenceTime: new Date('2024-12-22T20:20:00Z'),
    status: 'live',
  },
  {
    id: 'game-2',
    sportKey: 'basketball_nba',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Boston Celtics',
    commenceTime: new Date('2024-12-22T19:30:00Z'),
    status: 'live',
  },
  {
    id: 'game-3',
    sportKey: 'americanfootball_nfl',
    homeTeam: 'Philadelphia Eagles',
    awayTeam: 'Dallas Cowboys',
    commenceTime: new Date('2024-12-23T13:00:00Z'),
    status: 'upcoming',
  },
  {
    id: 'game-4',
    sportKey: 'basketball_nba',
    homeTeam: 'Golden State Warriors',
    awayTeam: 'Phoenix Suns',
    commenceTime: new Date('2024-12-22T22:00:00Z'),
    status: 'upcoming',
  },
  {
    id: 'game-5',
    sportKey: 'icehockey_nhl',
    homeTeam: 'Toronto Maple Leafs',
    awayTeam: 'Montreal Canadiens',
    commenceTime: new Date('2024-12-23T19:00:00Z'),
    status: 'upcoming',
  },
  {
    id: 'game-6',
    sportKey: 'soccer_epl',
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    commenceTime: new Date('2024-12-24T12:30:00Z'),
    status: 'upcoming',
  },
];

// ============================================
// Seed Functions
// ============================================

async function seedUser() {
  console.log('🌱 Seeding demo user...');

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: DEMO_USER,
  });

  // Create user profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      firstName: 'John',
      lastName: 'Doe',
      country: 'US',
      timezone: 'America/New_York',
      language: 'en',
    },
  });

  // Create password for credentials login
  console.log('🌱 Creating password for demo user...');
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await prisma.userPassword.upsert({
    where: { userId: user.id },
    update: { passwordHash },
    create: {
      userId: user.id,
      passwordHash,
      failedLoginAttempts: 0,
    },
  });
  console.log(`   ✅ Password set (use: ${DEMO_PASSWORD})`);

  // Create financial account with balance
  await prisma.financialAccount.upsert({
    where: { userId_accountType: { userId: user.id, accountType: 'main' } },
    update: { balance: new Decimal(1250), availableBalance: new Decimal(1250) },
    create: {
      userId: user.id,
      accountType: 'main',
      balance: new Decimal(1250),
      availableBalance: new Decimal(1250),
      currency: 'USD',
    },
  });

  console.log(`   ✅ Created user: ${user.email}`);
  return user;
}

async function seedTransactions(userId: string, accountId: string) {
  console.log('🌱 Seeding transactions...');

  for (const txn of transactions) {
    const txnType = txn.type === 'bet_placed' || txn.type === 'bet_lost'
      ? 'bet'
      : txn.type === 'bet_won'
        ? 'payout'
        : txn.type;

    // Calculate balance before based on amount change
    const balanceAfter = new Decimal(txn.balance);
    const balanceBefore = balanceAfter.minus(new Decimal(txn.amount));

    await prisma.transaction.upsert({
      where: { id: txn.id },
      update: {},
      create: {
        id: txn.id,
        userId,
        accountId,
        transactionType: txnType,
        amount: new Decimal(txn.amount),
        balanceBefore,
        balanceAfter,
        status: txn.status,
        description: txn.description,
        createdAt: new Date(txn.date),
        processedAt: txn.status === 'completed' ? new Date(txn.date) : null,
      },
    });
  }

  console.log(`   ✅ Created ${transactions.length} transactions`);
}

async function seedBets(userId: string) {
  console.log('🌱 Seeding bets...');

  for (const bet of userBets) {
    await prisma.bet.upsert({
      where: { id: bet.id },
      update: {},
      create: {
        id: bet.id,
        userId,
        betType: bet.type,
        totalStake: new Decimal(bet.stake),
        potentialPayout: new Decimal(bet.potentialWin),
        actualPayout: bet.actualWin ? new Decimal(bet.actualWin) : null,
        status: bet.status,
        placedAt: new Date(bet.placedAt),
        settledAt: bet.settledAt ? new Date(bet.settledAt) : null,
      },
    });
  }

  console.log(`   ✅ Created ${userBets.length} bets`);
}

async function seedNotifications(userId: string) {
  console.log('🌱 Seeding notifications...');

  for (const notif of notifications) {
    await prisma.notification.upsert({
      where: { id: notif.id },
      update: {},
      create: {
        id: notif.id,
        userId,
        type: notif.type,
        priority: notif.priority,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        dismissed: notif.dismissed,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        metadata: notif.metadata,
        createdAt: new Date(notif.timestamp),
        readAt: notif.read ? new Date(notif.timestamp) : null,
      },
    });
  }

  console.log(`   ✅ Created ${notifications.length} notifications`);
}

async function seedGames() {
  console.log('🌱 Seeding cached games (API snapshots)...');

  for (const game of featuredGames) {
    await prisma.apiOddsSnapshot.upsert({
      where: {
        externalGameId_bookmaker_timestamp: {
          externalGameId: game.id,
          bookmaker: 'fanduel',
          timestamp: new Date(),
        },
      },
      update: {},
      create: {
        externalGameId: game.id,
        sportKey: game.sportKey,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        commenceTime: game.commenceTime,
        bookmaker: 'fanduel',
        rawData: {
          markets: [
            { key: 'h2h', outcomes: [{ name: game.awayTeam, price: 145 }, { name: game.homeTeam, price: -165 }] },
            { key: 'spreads', outcomes: [{ name: game.awayTeam, price: -110, point: 3.5 }, { name: game.homeTeam, price: -110, point: -3.5 }] },
            { key: 'totals', outcomes: [{ name: 'Over', price: -110, point: 51.5 }, { name: 'Under', price: -110, point: 51.5 }] },
          ],
        },
      },
    });
  }

  console.log(`   ✅ Created ${featuredGames.length} game snapshots`);
}

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log('');
  console.log('🚀 Starting database seed...');
  console.log('');

  try {
    // Seed user and get ID
    const user = await seedUser();

    // Get financial account ID
    const account = await prisma.financialAccount.findFirst({
      where: { userId: user.id, accountType: 'main' },
    });

    if (account) {
      await seedTransactions(user.id, account.id);
    }

    await seedBets(user.id);
    await seedNotifications(user.id);
    await seedGames();

    console.log('');
    console.log('✨ Database seeded successfully!');
    console.log('');
    console.log('📋 Demo credentials:');
    console.log(`   Email: ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log('');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

