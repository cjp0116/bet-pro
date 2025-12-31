/**
 * Odds Sync Webhook
 * 
 * Called by QStash to sync odds for a specific DB game.
 * This is for games that exist in your database (Game model).
 * 
 * For API-based game fetching, use /api/games/featured instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@upstash/qstash/nextjs';
import { OddsSyncService } from '@/lib/odds/sync-service';
import { UnifiedOddsSync } from '@/lib/odds/unified-sync';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, isLive = false, sportId } = body;

    // If sportId provided, use unified sync (API-based)
    if (sportId) {
      const result = await UnifiedOddsSync.syncSport(sportId);
      return NextResponse.json({
        success: true,
        sportId,
        gamesCount: result.games.length,
        fromCache: result.fromCache,
        dbPersisted: result.dbPersisted,
      });
    }

    // If gameId provided, use legacy DB-based sync
    if (!gameId) {
      return NextResponse.json({ error: 'gameId or sportId required' }, { status: 400 });
    }

    const result = await OddsSyncService.syncGameOdds(gameId, isLive);
    return NextResponse.json({
      success: true,
      gameId,
      updatesCount: result?.updatesCount || 0
    });
  } catch (error) {
    console.error('Error syncing odds:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync odds',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// verify qstash signature
export const POST = verifySignature(handler);

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  const gameId = req.nextUrl.searchParams.get('gameId');
  const sportId = req.nextUrl.searchParams.get('sportId');

  if (sportId) {
    const result = await UnifiedOddsSync.syncSport(sportId);
    return NextResponse.json(result);
  }

  if (!gameId) {
    return NextResponse.json({ error: 'gameId or sportId required' }, { status: 400 });
  }

  const result = await OddsSyncService.syncGameOdds(gameId, false);
  return NextResponse.json(result);
}