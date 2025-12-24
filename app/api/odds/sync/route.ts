// called by qstash
import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@upstash/qstash/nextjs';
import { OddsSyncService } from '@/lib/odds/sync-service';

async function handler(req: NextRequest) {
  try {
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
    })
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
};

// verify qstash signature
export const POST = verifySignature(handler );

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