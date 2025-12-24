// cront job to monitor live games
import { OddsPubSub } from '@/lib/upstash/qstash';
import { OddsCache } from '@/lib/upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all live games
    const liveGames = await prisma.game.findMany({
      where: { status: 'live' },
      select: { id: true },
    });

    // Schedule sync for each live game
    for (const game of liveGames) {
      await OddsCache.addLiveGame(game.id);
      await OddsPubSub.scheduleOddsSync(game.id, 0);
    }

    return NextResponse.json({
      success: true,
      gamesScheduled: liveGames.length,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}