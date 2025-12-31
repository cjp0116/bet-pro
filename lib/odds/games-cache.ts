// Games cache service - stores Odds API responses in Redis and DB
import { redis } from '../upstash/redis';

// Cached game structure (matches frontend Game interface)
export interface CachedGame {
  id: string;
  sport: string;
  league: string;
  status: 'upcoming' | 'live' | 'finished';
  startTime: string;
  commenceTime: string; // ISO timestamp for sorting
  homeTeam: {
    name: string;
    abbr: string;
    logo: string;
    score?: number;
  };
  awayTeam: {
    name: string;
    abbr: string;
    logo: string;
    score?: number;
  };
  odds: {
    spread: { home: string; away: string; homeOdds: number; awayOdds: number };
    moneyline: { home: number; away: number };
    total: { line: number; over: number; under: number };
  };
  // Live game details
  completed?: boolean;
  gameTime?: string; // e.g., "Q3 5:42", "3rd Period", "2nd Half"
  lastScoreUpdate?: string; // ISO timestamp
  lastUpdated: string;
}

// Cache keys
const CACHE_KEYS = {
  // All games for a sport category
  sportGames: (sportId: string) => `games:sport:${sportId}`,
  // Featured/home page games
  featuredGames: () => `games:featured`,
  // Individual game by ID
  game: (gameId: string) => `game:${gameId}`,
  // Last sync timestamp for a sport
  lastSync: (sportId: string) => `sync:sport:${sportId}`,
  // All sports last sync
  allSportsLastSync: () => `sync:all`,
};

// TTL in seconds - aggressive freshness for odds
const CACHE_TTL = 30; // 30 second cache (hard expiry)
const STALE_THRESHOLD = 10; // Consider stale after 10 seconds (triggers background refresh)
const MIN_SYNC_INTERVAL = 5; // Minimum 5 seconds between API syncs (rate limit protection)

export class GamesCache {
  // Get cached games for a sport (or featured if no sport specified)
  static async getGames(sportId?: string): Promise<CachedGame[] | null> {
    const key = sportId ? CACHE_KEYS.sportGames(sportId) : CACHE_KEYS.featuredGames();
    const cached = await redis.get(key);

    if (!cached) return null;

    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return parsed as CachedGame[];
  }

  // Cache games for a sport
  static async setGames(games: CachedGame[], sportId?: string): Promise<void> {
    const key = sportId ? CACHE_KEYS.sportGames(sportId) : CACHE_KEYS.featuredGames();
    await redis.setex(key, CACHE_TTL, JSON.stringify(games));

    // Also cache individual games
    const pipeline = redis.pipeline();
    for (const game of games) {
      pipeline.setex(CACHE_KEYS.game(game.id), CACHE_TTL, JSON.stringify(game));
    }
    await pipeline.exec();
  }

  // Get a single game by ID
  static async getGame(gameId: string): Promise<CachedGame | null> {
    const cached = await redis.get(CACHE_KEYS.game(gameId));
    if (!cached) return null;
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return parsed as CachedGame;
  }

  // Check if cache is stale (should trigger background refresh)
  static async isStale(sportId?: string): Promise<boolean> {
    const key = sportId ? CACHE_KEYS.lastSync(sportId) : CACHE_KEYS.allSportsLastSync();
    const lastSync = await redis.get(key);

    if (!lastSync) return true;

    const lastSyncTime = typeof lastSync === 'string' ? parseInt(lastSync, 10) : lastSync as number;
    const now = Date.now();

    return (now - lastSyncTime) > (STALE_THRESHOLD * 1000);
  }

  // Check if we can sync (rate limit check)
  static async canSync(sportId?: string): Promise<boolean> {
    const key = sportId ? CACHE_KEYS.lastSync(sportId) : CACHE_KEYS.allSportsLastSync();
    const lastSync = await redis.get(key);

    if (!lastSync) return true;

    const lastSyncTime = typeof lastSync === 'string' ? parseInt(lastSync, 10) : lastSync as number;
    const now = Date.now();

    // Rate limit: minimum interval between syncs
    return (now - lastSyncTime) > (MIN_SYNC_INTERVAL * 1000);
  }

  // Get time since last sync in seconds
  static async getTimeSinceSync(sportId?: string): Promise<number | null> {
    const key = sportId ? CACHE_KEYS.lastSync(sportId) : CACHE_KEYS.allSportsLastSync();
    const lastSync = await redis.get(key);

    if (!lastSync) return null;

    const lastSyncTime = typeof lastSync === 'string' ? parseInt(lastSync, 10) : lastSync as number;
    return Math.floor((Date.now() - lastSyncTime) / 1000);
  }

  // Mark sync as completed
  static async markSynced(sportId?: string): Promise<void> {
    const key = sportId ? CACHE_KEYS.lastSync(sportId) : CACHE_KEYS.allSportsLastSync();
    await redis.setex(key, CACHE_TTL * 2, Date.now().toString());
  }

  // Invalidate cache for a sport
  static async invalidate(sportId?: string): Promise<void> {
    const key = sportId ? CACHE_KEYS.sportGames(sportId) : CACHE_KEYS.featuredGames();
    await redis.del(key);
  }

  // Get cache stats
  static async getStats(): Promise<{
    lastSync: number | null;
    cacheHits: number;
    sportsCached: string[];
  }> {
    const lastSync = await redis.get(CACHE_KEYS.allSportsLastSync());

    return {
      lastSync: lastSync ? (typeof lastSync === 'string' ? parseInt(lastSync, 10) : lastSync as number) : null,
      cacheHits: 0, // Would need to track this separately
      sportsCached: [], // Would need to scan keys
    };
  }
}

