/**
 * Bet Placement API
 * 
 * Validates odds before accepting bets to protect against stale odds exploitation.
 * Creates bet records in the database with odds snapshot for audit trail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { validateBetOdds, type BetSelectionInput } from '@/lib/odds/odds-validator';
import { notifyBetPlaced } from '@/lib/notifications-server';
import { Prisma } from '@/lib/generated/prisma/client';

const Decimal = Prisma.Decimal;

interface PlaceBetRequest {
  betType: 'single' | 'parlay';
  selections: Array<{
    gameId: string;
    type: 'spread' | 'moneyline' | 'total';
    selection: string; // 'home', 'away', 'over', 'under'
    odds: number;
    stake?: number; // For single bets
    team?: string;
    line?: string;
  }>;
  totalStake: number;
  potentialPayout: number;
}

function calculatePayout(stake: number, odds: number): number {
  if (odds > 0) {
    return stake + (stake * odds) / 100;
  } else {
    return stake + (stake * 100) / Math.abs(odds);
  }
}

function calculateParlayOdds(selections: { odds: number }[]): number {
  const decimalOdds = selections.map((sel) => {
    if (sel.odds > 0) return 1 + sel.odds / 100;
    return 1 + 100 / Math.abs(sel.odds);
  });
  const combinedOdds = decimalOdds.reduce((acc, odds) => acc * odds, 1);
  if (combinedOdds >= 2) return Math.round((combinedOdds - 1) * 100);
  return Math.round(-100 / (combinedOdds - 1));
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to place bets' },
        { status: 401 }
      );
    }

    const body: PlaceBetRequest = await req.json();
    const { betType, selections, totalStake } = body;

    // Basic validation
    if (!selections || selections.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'No selections provided' },
        { status: 400 }
      );
    }

    if (totalStake <= 0) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Invalid stake amount' },
        { status: 400 }
      );
    }

    // Validate odds for all selections
    const validationInputs: BetSelectionInput[] = selections.map(sel => ({
      gameId: sel.gameId,
      type: sel.type,
      selection: sel.selection,
      expectedOdds: sel.odds,
    }));

    const validation = await validateBetOdds(validationInputs);

    if (!validation.valid) {
      // Find selections with changed odds
      const changedSelections = validation.results
        .filter(r => !r.valid)
        .map(r => ({
          gameId: r.gameId,
          selection: r.selection,
          expectedOdds: r.expectedOdds,
          currentOdds: r.currentOdds,
          reason: r.reason,
        }));

      return NextResponse.json(
        {
          error: 'Odds changed',
          message: 'Some odds have changed since you added them to your bet slip',
          changedSelections,
          // Include current odds so frontend can offer to accept new odds
          currentOdds: validation.results.map(r => ({
            gameId: r.gameId,
            selection: r.selection,
            currentOdds: r.currentOdds,
            valid: r.valid,
          })),
        },
        { status: 409 } // Conflict - odds have changed
      );
    }

    // Calculate actual payout based on validated current odds
    let actualPayout: number;
    const oddsSnapshot: Record<string, number> = {};

    if (betType === 'parlay') {
      // Use current validated odds for parlay calculation
      const currentOdds = validation.results.map(r => ({ odds: r.currentOdds! }));
      const parlayOdds = calculateParlayOdds(currentOdds);
      actualPayout = calculatePayout(totalStake, parlayOdds);

      // Store odds snapshot
      validation.results.forEach(r => {
        oddsSnapshot[`${r.gameId}:${r.selection}`] = r.currentOdds!;
      });
    } else {
      // Single bets - calculate individual payouts
      actualPayout = selections.reduce((sum, sel, i) => {
        const stake = sel.stake || 0;
        const currentOdds = validation.results[i].currentOdds!;
        oddsSnapshot[`${sel.gameId}:${sel.selection}`] = currentOdds;
        return sum + calculatePayout(stake, currentOdds);
      }, 0);
    }

    const userId = session.user.id;

    // Check user's main financial account balance
    const account = await prisma.financialAccount.findUnique({
      where: { userId_accountType: { userId, accountType: 'main' } },
      select: { availableBalance: true },
    });

    if (!account || Number(account.availableBalance) < totalStake) {
      return NextResponse.json(
        { error: 'Insufficient funds', message: 'Your balance is too low for this bet' },
        { status: 400 }
      );
    }

    // Create bet in database (transaction to ensure atomicity)
    const bet = await prisma.$transaction(async (tx) => {
      // Deduct from user's available balance
      await tx.financialAccount.update({
        where: { userId_accountType: { userId, accountType: 'main' } },
        data: { availableBalance: { decrement: totalStake } },
      });

      // Create the bet record
      const newBet = await tx.bet.create({
        data: {
          userId,
          betType,
          totalStake: new Decimal(totalStake),
          potentialPayout: new Decimal(actualPayout),
          status: 'pending',
          oddsSnapshot: oddsSnapshot,
        },
      });

      return newBet;
    });

    // Create notification for successful bet (non-blocking)
    notifyBetPlaced(
      userId,
      bet.id,
      totalStake,
      actualPayout,
      betType,
      selections.length
    ).catch(err => console.error('Failed to create bet notification:', err));

    return NextResponse.json({
      success: true,
      betId: bet.id,
      betType,
      totalStake,
      potentialPayout: actualPayout,
      oddsSnapshot,
      message: 'Bet placed successfully',
    });

  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to place bet. Please try again.' },
      { status: 500 }
    );
  }
}

