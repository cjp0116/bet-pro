// Cron job to sync odds from external API to cache
// Can be called by Vercel Cron, QStash, or any scheduler
import { NextRequest, NextResponse } from 'next/server';
import { ExternalOddsSync } from '@/lib/odds/external-sync';
import { GamesCache } from '@/lib/odds/games-cache';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if no secret configured (dev mode)

  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sportId = req.nextUrl.searchParams.get('sport');
    const results: { sport: string; games: number; fromCache: boolean }[] = [];

    if (sportId) {
      // Sync specific sport
      await GamesCache.invalidate(sportId);
      const result = await ExternalOddsSync.syncSport(sportId);
      results.push({ sport: sportId, games: result.games.length, fromCache: result.fromCache });
    } else {
      // Sync all supported sports
      const sports = ExternalOddsSync.getSupportedSports();

      for (const sport of sports) {
        await GamesCache.invalidate(sport);
        const result = await ExternalOddsSync.syncSport(sport);
        results.push({ sport, games: result.games.length, fromCache: result.fromCache });
      }

      // Also sync featured
      await GamesCache.invalidate();
      const featured = await ExternalOddsSync.syncFeatured();
      results.push({ sport: 'featured', games: featured.games.length, fromCache: featured.fromCache });
    }

    return NextResponse.json({
      success: true,
      synced: results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST for QStash webhooks
export async function POST(req: NextRequest) {
  return GET(req);
}

