// Cron job to sync odds from external API to cache + DB
// Can be called by Vercel Cron, QStash, or any scheduler
import { NextRequest, NextResponse } from 'next/server';
import { UnifiedOddsSync } from '@/lib/odds/unified-sync';

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
      // Sync specific sport - let sync logic handle staleness
      const result = await UnifiedOddsSync.syncSport(sportId);
      results.push({ sport: sportId, games: result.games.length, fromCache: result.fromCache, dbPersisted: result.dbPersisted });
    } else {
      // Sync all supported sports - let sync logic handle staleness
      const sports = UnifiedOddsSync.getSupportedSports();

      for (const sport of sports) {
        const result = await UnifiedOddsSync.syncSport(sport);
        results.push({ sport, games: result.games.length, fromCache: result.fromCache, dbPersisted: result.dbPersisted });
      }

      // Also sync featured
      const featured = await UnifiedOddsSync.syncFeatured();
      results.push({ sport: 'featured', games: featured.games.length, fromCache: featured.fromCache, dbPersisted: featured.dbPersisted });
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

