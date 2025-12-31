/**
 * Odds Sync Webhook
 * 
 * Called by QStash or cron to sync odds for a sport.
 * Uses UnifiedOddsSync which caches to Redis + persists to DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { UnifiedOddsSync } from '@/lib/odds/unified-sync';
import { GamesCache } from '@/lib/odds/games-cache';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Verify QStash signature
    const signature = req.headers.get('upstash-signature');
    const body = await req.text();

    if (signature && process.env.QSTASH_CURRENT_SIGNING_KEY) {
      const isValid = await receiver.verify({
        signature,
        body,
      });
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { sportId, forceRefresh = false } = JSON.parse(body);

    if (!sportId) {
      return NextResponse.json({ error: 'sportId required' }, { status: 400 });
    }
    if(sportId && typeof sportId !== 'string') {
      return NextResponse.json({ error: 'sportId must be a string' }, { status: 400 });
    }
    // Invalidate cache if force refresh
    if (forceRefresh) {
      await GamesCache.invalidate(sportId);
    }

    const result = await UnifiedOddsSync.syncSport(sportId);
    return NextResponse.json({
      success: true,
      sportId,
      gamesCount: result.games.length,
      fromCache: result.fromCache,
      isStale: result.isStale,
      dbPersisted: result.dbPersisted,
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

// Dev/debug endpoint
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  const sportId = req.nextUrl.searchParams.get('sportId');
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

  if (!sportId) {
    // Return supported sports
    const sports = UnifiedOddsSync.getSupportedSports();
    return NextResponse.json({
      message: 'Provide ?sportId=<sport> to sync',
      supportedSports: sports,
    });
  }

  if (forceRefresh) {
    await GamesCache.invalidate(sportId);
  }

  const result = await UnifiedOddsSync.syncSport(sportId);
  return NextResponse.json(result);
}
