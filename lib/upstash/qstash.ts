import { Client } from "@upstash/qstash";

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN as string,
});

export class OddsPubSub {
  // publish odds change event
  static async publishOddsChange(change: {
    gameId: string;
    selectionId: string;
    oldOdds: number;
    newOdds: number;
    timestamp: number;
  }) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/odds-update`;

    try {
      await qstash.publishJSON({
        url: webhookUrl,
        body: {
          type: 'odds_change',
          data: change
        }
      })
    } catch (error) {
      console.error('Failed to publish odds change:', error);
    }
  }


  // schedule odds sync job
  static async scheduleOddsSync(gameId: string, delaySeconds: number = 2) {
    const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/odds/sync`;
    try {
      await qstash.publishJSON({
        url: syncUrl,
        body: { gameId },
        delay: delaySeconds,
      }); 
    } catch (error) {
      console.error('Failed to schedule odds sync:', error);
    }
  }

  // schedule recurring sync for live game
  static async scheduleRecurringSync(gameId: string) {
    const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/odds/sync`;
    try {
      // schedule job to run every 2 seconds for 2 hours
      await qstash.publishJSON({
        url: syncUrl,
        body: { gameId, isLive: true },
        cron: '*/2 * * * * *' // every 2 seconds
      })
    } catch (error) {
      console.error('failed to schedule recurring odds sync:', error);
    }
  }
}