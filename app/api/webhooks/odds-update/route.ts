// webhook for odds updates (received from qstash)

import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { redis } from '@/lib/upstash/redis';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Verify QStash signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers.get('upstash-signature');
      const bodyText = await req.text();
      
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const isValid = await receiver.verify({
        signature,
        body: bodyText,
      });

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const { type, data } = JSON.parse(bodyText);
      return await processWebhook(type, data);
    }

    // Development mode - skip signature verification
    const body = await req.json();
    const { type, data } = body;
    return await processWebhook(type, data);

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processWebhook(type: string, data: { gameId: string }) {
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
  }

  return NextResponse.json({ success: true });
}