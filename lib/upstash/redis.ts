import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

export class OddsCache {
  private static ODDS_TTL = 300;
  private static GAME_ODDS_KEY = (gameId: string) => `game:odds:${gameId}`;
  private static SELECTION_ODDS_KEY = (selectionId: string) => `selection:odds:${selectionId}`;
  private static LIVE_GAMES_KEY = `games:live`;
  private static ACTIVE_GAMES_KEY = `games:active`;

  // cache odds for a game
  static async cacheGameOdds(gameId: string, odds: any[]) {
    const key = this.GAME_ODDS_KEY(gameId);
    await redis.setex(key, this.ODDS_TTL, JSON.stringify(odds));
    // cache individual selections
    const pipeline = redis.pipeline();
    odds.forEach((odd) => {
      pipeline.setex(
        this.SELECTION_ODDS_KEY(odd.selectionId),
        this.ODDS_TTL,
        JSON.stringify(odd)
      )
    });
    await pipeline.exec();
  };

  // get game odds from cache
  static async getGameOdds(gameId: string) {
    const key = this.GAME_ODDS_KEY(gameId);
    const cached = await redis.get(key)
    return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
  };

  // get selection odds from cache
  static async getSelectionOdds(selectionId: string) {
    const key = this.SELECTION_ODDS_KEY(selectionId);
    const cached = await redis.get(key);
    return cached ? (typeof cached === 'string' ? JSON.parse(cached) : cached) : null;
  };

  // track live games
  static async addLiveGame(gameId: string) {
    await redis.sadd(this.LIVE_GAMES_KEY, gameId);
  }

  // remove live game
  static async removeLiveGame(gameId: string) {
    await redis.srem(this.LIVE_GAMES_KEY, gameId);
  }

  // get live games
  static async getLiveGames() {
    return await redis.smembers(this.LIVE_GAMES_KEY);
  }
  
  static async publishOddsChanges(change: {
    gameId: string;
    selectionId: string;
    oldOdds: number;
    newOdds: number;
    timestamp: number;
  }) {
    await redis.publish(`odds:changes`, JSON.stringify(change));
  }

  static async subscribeToOddsChanges(callback: (message: any) => void) {

  }

}