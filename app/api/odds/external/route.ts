// Fetch odds directly from The Odds API (dev/debug endpoint)
import { NextRequest, NextResponse } from 'next/server';
import { OddsSyncService } from '@/lib/odds/sync-service';

export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const sportCode = req.nextUrl.searchParams.get('sport');

  try {
    if (sportCode) {
      // Fetch odds for a specific sport
      const odds = await OddsSyncService.fetchSportOdds(sportCode);
      return NextResponse.json({
        sport: sportCode,
        eventsCount: odds.length,
        events: odds,
      });
    } else {
      // Fetch available sports
      const sports = await OddsSyncService.fetchAvailableSports();
      return NextResponse.json({
        sportsCount: sports.length,
        sports,
      });
    }
  } catch (error) {
    console.error('Error fetching from Odds API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch from Odds API',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

