// get current odds for frontend
import { NextRequest, NextResponse } from 'next/server';
import { OddsCache } from '@/lib/upstash/redis';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params;

    // Try cache first
    let odds = await OddsCache.getGameOdds(gameId);

    // If not in cache, fetch from database
    if (!odds) {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          markets: {
            where: { active: true },
            include: {
              selections: {
                where: { status: 'active' },
                include: {
                  currentOdds: true,
                },
              },
            },
          },
        },
      });

      if (!game) {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }

      // Format for response
      odds = game.markets.flatMap(market =>
        market.selections.map(selection => ({
          selectionId: selection.id,
          marketId: market.id,
          marketType: market.marketType,
          name: selection.name,
          odds: selection.currentOdds?.currentOdds.toNumber() || selection.odds.toNumber(),
          previousOdds: selection.currentOdds?.previousOdds?.toNumber(),
          movement: selection.currentOdds?.oddsMovement,
          lastUpdated: selection.currentOdds?.lastUpdatedAt,
        }))
      );

      // Cache for next time
      await OddsCache.cacheGameOdds(gameId, odds);
    }

    return NextResponse.json({ gameId, odds });

  } catch (error) {
    console.error('Error fetching odds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch odds' },
      { status: 500 }
    );
  }
}