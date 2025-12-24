// webhook for odds updates (received from qstash)

import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@upstash/qstash/nextjs';
import { redis } from '@/lib/upstash/redis';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'odds_change') {
      // Store the change event in a list for clients to poll
      const eventKey = `odds:events:${data.gameId}`;

      await redis.lpush(eventKey, JSON.stringify(data));
      await redis.ltrim(eventKey, 0, 99); // Keep last 100 events
      await redis.expire(eventKey, 3600); // Expire after 1 hour

      // Also store in a global recent changes list
      await redis.lpush('odds:recent-changes', JSON.stringify(data));
      await redis.ltrim('odds:recent-changes', 0, 999);
      await redis.expire('odds:recent-changes', 300); // 5 minutes

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export const POST = verifySignature(handler);