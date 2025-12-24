// start live odds sync for a game
import { NextRequest, NextResponse } from 'next/server';
import { OddsPubSub } from '@/lib/upstash/qstash';
import { OddsCache } from '@/lib/upstash/redis';
import { prisma } from '@/lib/db/prisma';


export async function POST(req: NextRequest) {
  try {
    const { gameId } = await req.json();

    // Verify game exists and is live
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Add to live games set
    await OddsCache.addLiveGame(gameId);

    // Trigger immediate sync
    await OddsPubSub.scheduleOddsSync(gameId, 0);

    return NextResponse.json({
      success: true,
      gameId,
      message: 'Live odds sync started',
    });

  } catch (error) {
    console.error('Error starting live sync:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}