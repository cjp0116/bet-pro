// Webhook for odds updates (received from QStash)

import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { redis } from '@/lib/upstash/redis';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Verify QStash signature
    const signature = req.headers.get('upstash-signature');
    const body = await req.text();

    if (signature && process.env.QSTASH_CURRENT_SIGNING_KEY) {
      const isValid = await receiver.verify({
        signature,
        body,
      });
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { type, data } = JSON.parse(body);

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
