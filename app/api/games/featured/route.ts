// Fetch featured games - prioritizes fresh odds data
import { NextRequest, NextResponse } from 'next/server';
import { ExternalOddsSync } from '@/lib/odds/external-sync';
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
      result = await ExternalOddsSync.syncSport(sportId);
    } else {
      result = await ExternalOddsSync.syncFeatured();
    }

    // Set cache headers for client-side caching
    const headers = new Headers();
    // Short cache for fresh data, encourage frequent updates
    headers.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=10');

    return NextResponse.json({
      games: result.games,
      count: result.games.length,
      meta: {
        fromCache: result.fromCache,
        isStale: result.isStale,
        ageSeconds: result.ageSeconds,
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
