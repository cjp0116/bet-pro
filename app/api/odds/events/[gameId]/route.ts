// polling endpoint for recent changes
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/upstash/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const since = req.nextUrl.searchParams.get('since');

    const eventKey = `odds:events:${gameId}`;
    const events = await redis.lrange(eventKey, 0, 49); // Get last 50 events

    // Parse events
    const parsedEvents = events
      .map((e: string) => {
        try {
          return typeof e === 'string' ? JSON.parse(e) : e;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((event: any) => !since || event.timestamp > parseInt(since));

    return NextResponse.json({
      gameId,
      events: parsedEvents,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}