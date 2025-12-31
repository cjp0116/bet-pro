// called by qstash
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { OddsSyncService } from '@/lib/odds/sync-service';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Verify QStash signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers.get('upstash-signature');
      const body = await req.text();
      
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const isValid = await receiver.verify({
        signature,
        body,
      });

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const { gameId, isLive = false } = JSON.parse(body);
      if (!gameId) {
        return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
      }

      const result = await OddsSyncService.syncGameOdds(gameId, isLive);
      return NextResponse.json({
        success: true,
        gameId,
        updatesCount: result?.updatesCount || 0
      });
    }

    // Development mode - skip signature verification
    const body = await req.json();
    const { gameId, isLive = false } = body;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
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

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  const gameId = req.nextUrl.searchParams.get('gameId');
  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  }

  const result = await OddsSyncService.syncGameOdds(gameId, false);
  return NextResponse.json(result);
}