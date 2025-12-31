// Fetch featured games - Redis cache + DB persistence for audit
import { NextRequest, NextResponse } from 'next/server';
import { UnifiedOddsSync } from '@/lib/odds/unified-sync';
import { GamesCache } from '@/lib/odds/games-cache';

export async function GET(req: NextRequest) {
  try {
    const sportId = req.nextUrl.searchParams.get('sport');
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

    // Force refresh if requested (for admin/debug)
    if (forceRefresh) {
      await GamesCache.invalidate(sportId || undefined);
    }

    let result;

    if (sportId) {
      result = await UnifiedOddsSync.syncSport(sportId);
    } else {
      result = await UnifiedOddsSync.syncFeatured();
    }

    // Set cache headers for client-side caching
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');

    return NextResponse.json({
      games: result.games,
      count: result.games.length,
      meta: {
        fromCache: result.fromCache,
        isStale: result.isStale,
        ageSeconds: result.ageSeconds,
        dbPersisted: result.dbPersisted,
        timestamp: new Date().toISOString(),
      },
    }, { headers });

  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
