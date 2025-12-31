/**
 * Unified Odds Sync Service
 * 
 * Architecture:
 * 1. Redis: Fast cache for client requests (TTL: 30s)
 * 2. Database: Persistent storage for audit trail
 * 
 * Flow:
 * - Client requests → Check Redis cache
 * - If stale → Fetch from Odds API → Update Redis + DB
 * - DB stores: CachedApiGame (raw events), OddsSnapshot (historical), OddsChangeEvent (audit)
 */

import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../db/prisma';
import { GamesCache, type CachedGame } from './games-cache';

const Decimal = Prisma.Decimal;

// The Odds API types
interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

// Sport mappings
const FEATURED_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'icehockey_nhl',
  'baseball_mlb',
];

const SPORT_KEY_MAP: Record<string, { id: string; name: string }> = {
  americanfootball_nfl: { id: 'football', name: 'NFL' },
  americanfootball_ncaaf: { id: 'football', name: 'NCAAF' },
  basketball_nba: { id: 'basketball', name: 'NBA' },
  basketball_ncaab: { id: 'basketball', name: 'NCAAB' },
  icehockey_nhl: { id: 'hockey', name: 'NHL' },
  baseball_mlb: { id: 'baseball', name: 'MLB' },
  soccer_epl: { id: 'soccer', name: 'EPL' },
  soccer_usa_mls: { id: 'soccer', name: 'MLS' },
  soccer_spain_la_liga: { id: 'soccer', name: 'La Liga' },
  soccer_germany_bundesliga: { id: 'soccer', name: 'Bundesliga' },
  soccer_italy_serie_a: { id: 'soccer', name: 'Serie A' },
  soccer_france_ligue_one: { id: 'soccer', name: 'Ligue 1' },
  mma_mixed_martial_arts: { id: 'mma', name: 'UFC' },
  tennis_atp_australian_open: { id: 'tennis', name: 'ATP' },
  tennis_wta_australian_open: { id: 'tennis', name: 'WTA' },
  tennis_atp_us_open: { id: 'tennis', name: 'ATP' },
  tennis_wta_us_open: { id: 'tennis', name: 'WTA' },
  tennis_atp_french_open: { id: 'tennis', name: 'ATP' },
  tennis_wta_french_open: { id: 'tennis', name: 'WTA' },
  tennis_atp_wimbledon: { id: 'tennis', name: 'ATP' },
  tennis_wta_wimbledon: { id: 'tennis', name: 'WTA' },
  golf_pga_championship_winner: { id: 'golf', name: 'PGA' },
  golf_masters_tournament_winner: { id: 'golf', name: 'Masters' },
  golf_us_open_winner: { id: 'golf', name: 'US Open' },
  golf_the_open_championship_winner: { id: 'golf', name: 'The Open' },
};

const SPORT_ID_TO_API_KEYS: Record<string, string[]> = {
  football: ['americanfootball_nfl', 'americanfootball_ncaaf'],
  basketball: ['basketball_nba', 'basketball_ncaab'],
  baseball: ['baseball_mlb'],
  hockey: ['icehockey_nhl'],
  soccer: ['soccer_epl', 'soccer_usa_mls', 'soccer_spain_la_liga', 'soccer_germany_bundesliga', 'soccer_italy_serie_a'],
  mma: ['mma_mixed_martial_arts'],
  tennis: ['tennis_atp_australian_open', 'tennis_wta_australian_open', 'tennis_atp_us_open', 'tennis_wta_us_open'],
  golf: ['golf_pga_championship_winner', 'golf_masters_tournament_winner', 'golf_us_open_winner', 'golf_the_open_championship_winner'],
};

const PREFERRED_BOOKMAKERS = ['fanduel', 'draftkings', 'betmgm', 'caesars', 'pointsbetus'];

// Sync result type
export interface SyncResult {
  games: CachedGame[];
  fromCache: boolean;
  isStale: boolean;
  ageSeconds: number | null;
  dbPersisted: boolean;
}

// Odds change for audit
interface OddsChange {
  externalGameId: string;
  sportKey: string;
  marketKey: string;
  selectionName: string;
  oldOdds: number;
  newOdds: number;
  changePercent: number;
}

export class UnifiedOddsSync {
  /**
   * Sync games for a sport - Redis cache + DB persistence
   */
  static async syncSport(sportId: string): Promise<SyncResult> {
    const cached = await GamesCache.getGames(sportId);
    const isStale = await GamesCache.isStale(sportId);
    const canSync = await GamesCache.canSync(sportId);
    const ageSeconds = await GamesCache.getTimeSinceSync(sportId);

    // Return cached if fresh or rate limited
    if (cached && !isStale) {
      return { games: cached, fromCache: true, isStale: false, ageSeconds, dbPersisted: false };
    }

    if (cached && !canSync) {
      return { games: cached, fromCache: true, isStale: true, ageSeconds, dbPersisted: false };
    }

    // Fetch fresh data
    const apiKeys = SPORT_ID_TO_API_KEYS[sportId] || [];
    if (apiKeys.length === 0) {
      return { games: cached || [], fromCache: !!cached, isStale: true, ageSeconds, dbPersisted: false };
    }

    console.log(`[UnifiedSync] Fetching ${sportId} (cache age: ${ageSeconds}s)`);

    const { games, rawEvents } = await this.fetchFromOddsApi(apiKeys);

    if (games.length > 0) {
      // Update Redis cache
      await GamesCache.setGames(games, sportId);
      await GamesCache.markSynced(sportId);

      // Persist to database for audit trail
      const dbPersisted = await this.persistToDatabase(rawEvents, cached || []);

      return { games, fromCache: false, isStale: false, ageSeconds: 0, dbPersisted };
    }

    // API returned no games
    if (cached) {
      return { games: cached, fromCache: true, isStale: true, ageSeconds, dbPersisted: false };
    }

    return { games: [], fromCache: false, isStale: false, ageSeconds: null, dbPersisted: false };
  }

  /**
   * Sync featured games for home page
   */
  static async syncFeatured(): Promise<SyncResult> {
    const cached = await GamesCache.getGames();
    const isStale = await GamesCache.isStale();
    const canSync = await GamesCache.canSync();
    const ageSeconds = await GamesCache.getTimeSinceSync();

    if (cached && !isStale) {
      return { games: cached, fromCache: true, isStale: false, ageSeconds, dbPersisted: false };
    }

    if (cached && !canSync) {
      return { games: cached, fromCache: true, isStale: true, ageSeconds, dbPersisted: false };
    }

    console.log(`[UnifiedSync] Fetching featured (cache age: ${ageSeconds}s)`);

    const { games, rawEvents } = await this.fetchFromOddsApi(FEATURED_SPORTS);

    if (games.length > 0) {
      const featured = games.slice(0, 12);
      await GamesCache.setGames(featured);
      await GamesCache.markSynced();

      const dbPersisted = await this.persistToDatabase(rawEvents, cached || []);

      return { games: featured, fromCache: false, isStale: false, ageSeconds: 0, dbPersisted };
    }

    if (cached) {
      return { games: cached, fromCache: true, isStale: true, ageSeconds, dbPersisted: false };
    }

    return { games: [], fromCache: false, isStale: false, ageSeconds: null, dbPersisted: false };
  }

  /**
   * Fetch from Odds API
   */
  private static async fetchFromOddsApi(sportKeys: string[]): Promise<{
    games: CachedGame[];
    rawEvents: OddsApiEvent[];
  }> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      console.error('[UnifiedSync] ODDS_API_KEY not configured');
      return { games: [], rawEvents: [] };
    }

    const allGames: CachedGame[] = [];
    const allEvents: OddsApiEvent[] = [];

    for (const sportKey of sportKeys) {
      try {
        const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('regions', 'us');
        url.searchParams.set('markets', 'h2h,spreads,totals');
        url.searchParams.set('oddsFormat', 'american');

        const response = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          console.error(`[UnifiedSync] Odds API error for ${sportKey}: ${response.status}`);
          continue;
        }

        const remaining = response.headers.get('x-requests-remaining');
        console.log(`[UnifiedSync] ${sportKey} fetched, ${remaining} requests remaining`);

        const events: OddsApiEvent[] = await response.json();
        allEvents.push(...events);

        for (const event of events) {
          const game = this.transformEventToGame(event);
          if (game) {
            allGames.push(game);
          }
        }
      } catch (error) {
        console.error(`[UnifiedSync] Failed to fetch ${sportKey}:`, error);
      }
    }

    // Sort by commence time
    allGames.sort((a, b) =>
      new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
    );

    return { games: allGames, rawEvents: allEvents };
  }

  /**
   * Persist to database for audit trail
   */
  private static async persistToDatabase(
    newEvents: OddsApiEvent[],
    cachedGames: CachedGame[]
  ): Promise<boolean> {
    try {
      // Build lookup map for detecting changes
      const cachedMap = new Map<string, CachedGame>();
      for (const game of cachedGames) {
        cachedMap.set(game.id, game);
      }

      const changes: OddsChange[] = [];
      const snapshots: Array<{
        externalGameId: string;
        sportKey: string;
        homeTeam: string;
        awayTeam: string;
        commenceTime: string;
        bookmaker: string;
        markets: OddsApiMarket[];
        timestamp: Date;
      }> = [];

      for (const event of newEvents) {
        const bookmaker = event.bookmakers.find(b => PREFERRED_BOOKMAKERS.includes(b.key))
          || event.bookmakers[0];

        if (!bookmaker) continue;

        // Store snapshot
        snapshots.push({
          externalGameId: event.id,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          bookmaker: bookmaker.key,
          markets: bookmaker.markets,
          timestamp: new Date(),
        });

        // Detect changes
        const cached = cachedMap.get(event.id);
        if (cached) {
          const newOdds = this.extractOdds(bookmaker);
          const oldOdds = cached.odds;

          // Check moneyline changes
          if (oldOdds.moneyline.home !== newOdds.moneyline.home) {
            changes.push({
              externalGameId: event.id,
              sportKey: event.sport_key,
              marketKey: 'h2h',
              selectionName: event.home_team,
              oldOdds: oldOdds.moneyline.home,
              newOdds: newOdds.moneyline.home,
              changePercent: this.calcChangePercent(oldOdds.moneyline.home, newOdds.moneyline.home),
            });
          }

          if (oldOdds.moneyline.away !== newOdds.moneyline.away) {
            changes.push({
              externalGameId: event.id,
              sportKey: event.sport_key,
              marketKey: 'h2h',
              selectionName: event.away_team,
              oldOdds: oldOdds.moneyline.away,
              newOdds: newOdds.moneyline.away,
              changePercent: this.calcChangePercent(oldOdds.moneyline.away, newOdds.moneyline.away),
            });
          }

          // Check spread changes
          if (oldOdds.spread.homeOdds !== newOdds.spread.homeOdds) {
            changes.push({
              externalGameId: event.id,
              sportKey: event.sport_key,
              marketKey: 'spreads',
              selectionName: `${event.home_team} ${newOdds.spread.home}`,
              oldOdds: oldOdds.spread.homeOdds,
              newOdds: newOdds.spread.homeOdds,
              changePercent: this.calcChangePercent(oldOdds.spread.homeOdds, newOdds.spread.homeOdds),
            });
          }

          // Check total changes
          if (oldOdds.total.over !== newOdds.total.over) {
            changes.push({
              externalGameId: event.id,
              sportKey: event.sport_key,
              marketKey: 'totals',
              selectionName: `Over ${newOdds.total.line}`,
              oldOdds: oldOdds.total.over,
              newOdds: newOdds.total.over,
              changePercent: this.calcChangePercent(oldOdds.total.over, newOdds.total.over),
            });
          }
        }
      }

      // Batch insert to database
      if (snapshots.length > 0 || changes.length > 0) {
        await prisma.$transaction(async (tx) => {
          // Store raw API snapshots for full audit trail
          for (const snapshot of snapshots) {
            await (tx as any).apiOddsSnapshot.upsert({
              where: {
                externalGameId_timestamp: {
                  externalGameId: snapshot.externalGameId,
                  timestamp: snapshot.timestamp,
                },
              },
              create: {
                externalGameId: snapshot.externalGameId,
                sportKey: snapshot.sportKey,
                homeTeam: snapshot.homeTeam,
                awayTeam: snapshot.awayTeam,
                commenceTime: new Date(snapshot.commenceTime),
                bookmaker: snapshot.bookmaker,
                rawData: snapshot.markets as any,
                timestamp: snapshot.timestamp,
              },
              update: {
                rawData: snapshot.markets as any,
              },
            });
          }

          // Store odds change events for fraud detection
          for (const change of changes) {
            await (tx as any).oddsAuditLog.create({
              data: {
                externalGameId: change.externalGameId,
                sportKey: change.sportKey,
                marketKey: change.marketKey,
                selectionName: change.selectionName,
                oldOdds: new Decimal(change.oldOdds),
                newOdds: new Decimal(change.newOdds),
                changePercent: new Decimal(change.changePercent),
                changeType: Math.abs(change.changePercent) > 10 ? 'significant' : 'minor',
              },
            });
          }
        });

        console.log(`[UnifiedSync] Persisted ${snapshots.length} snapshots, ${changes.length} changes`);
      }

      return true;
    } catch (error) {
      console.error('[UnifiedSync] DB persistence error:', error);
      return false;
    }
  }

  private static calcChangePercent(oldVal: number, newVal: number): number {
    if (oldVal === 0) return 0;
    return Math.abs((newVal - oldVal) / Math.abs(oldVal)) * 100;
  }

  private static transformEventToGame(event: OddsApiEvent): CachedGame | null {
    const sportInfo = SPORT_KEY_MAP[event.sport_key] || { id: 'other', name: event.sport_title };

    const bookmaker = event.bookmakers.find(b => PREFERRED_BOOKMAKERS.includes(b.key))
      || event.bookmakers[0];

    if (!bookmaker) return null;

    const now = new Date();
    const gameTime = new Date(event.commence_time);
    const isLive = gameTime <= now && (gameTime.getTime() + 3 * 60 * 60 * 1000) > now.getTime();

    return {
      id: event.id,
      sport: sportInfo.id,
      league: sportInfo.name,
      status: isLive ? 'live' : 'upcoming',
      startTime: this.formatGameTime(event.commence_time),
      commenceTime: event.commence_time,
      homeTeam: {
        name: event.home_team,
        abbr: this.getTeamAbbr(event.home_team),
        logo: '/placeholder.svg',
        score: undefined, // Would need scores API
      },
      awayTeam: {
        name: event.away_team,
        abbr: this.getTeamAbbr(event.away_team),
        logo: '/placeholder.svg',
        score: undefined,
      },
      odds: this.extractOdds(bookmaker),
      lastUpdated: new Date().toISOString(),
    };
  }

  private static extractOdds(bookmaker: OddsApiBookmaker) {
    const h2h = bookmaker.markets.find(m => m.key === 'h2h');
    const spreads = bookmaker.markets.find(m => m.key === 'spreads');
    const totals = bookmaker.markets.find(m => m.key === 'totals');

    const odds = {
      spread: { home: '0', away: '0', homeOdds: -110, awayOdds: -110 },
      moneyline: { home: 0, away: 0 },
      total: { line: 0, over: -110, under: -110 },
    };

    if (h2h?.outcomes && h2h.outcomes.length >= 2) {
      odds.moneyline.away = h2h.outcomes[0].price;
      odds.moneyline.home = h2h.outcomes[1].price;
    }

    if (spreads?.outcomes) {
      for (const outcome of spreads.outcomes) {
        if (outcome.point !== undefined) {
          if (spreads.outcomes.indexOf(outcome) === 0) {
            odds.spread.away = outcome.point >= 0 ? `+${outcome.point}` : `${outcome.point}`;
            odds.spread.awayOdds = outcome.price;
          } else {
            odds.spread.home = outcome.point >= 0 ? `+${outcome.point}` : `${outcome.point}`;
            odds.spread.homeOdds = outcome.price;
          }
        }
      }
    }

    if (totals?.outcomes) {
      const over = totals.outcomes.find(o => o.name.toLowerCase() === 'over');
      const under = totals.outcomes.find(o => o.name.toLowerCase() === 'under');

      if (over?.point !== undefined) {
        odds.total.line = over.point;
        odds.total.over = over.price;
      }
      if (under?.price !== undefined) {
        odds.total.under = under.price;
      }
    }

    return odds;
  }

  private static formatGameTime(commenceTime: string): string {
    const date = new Date(commenceTime);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (diffDays === 0) {
      return `Today ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow ${timeStr}`;
    } else {
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayStr} ${timeStr}`;
    }
  }

  private static getTeamAbbr(teamName: string): string {
    const abbrevMap: Record<string, string> = {
      'Kansas City Chiefs': 'KC',
      'Buffalo Bills': 'BUF',
      'Philadelphia Eagles': 'PHI',
      'Dallas Cowboys': 'DAL',
      'San Francisco 49ers': 'SF',
      'Los Angeles Lakers': 'LAL',
      'Boston Celtics': 'BOS',
      'Golden State Warriors': 'GSW',
      'Miami Heat': 'MIA',
      'Phoenix Suns': 'PHX',
      'Toronto Maple Leafs': 'TOR',
      'Montreal Canadiens': 'MTL',
      'New York Yankees': 'NYY',
      'Los Angeles Dodgers': 'LAD',
      'Manchester United': 'MUN',
      'Liverpool': 'LIV',
    };

    if (abbrevMap[teamName]) return abbrevMap[teamName];

    const words = teamName.split(' ');
    if (words.length === 1) return teamName.substring(0, 3).toUpperCase();
    return words[words.length - 1].substring(0, 3).toUpperCase();
  }

  static getSupportedSports(): string[] {
    return Object.keys(SPORT_ID_TO_API_KEYS);
  }
}

