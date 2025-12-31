// src/lib/odds/sync-service.ts
import { Prisma } from '../../generated/prisma/client';
import { OddsCache } from '../upstash/redis';
import { OddsPubSub } from '../upstash/qstash';
import { prisma } from '../db/prisma';

// Use Prisma.Decimal for Decimal type
const Decimal = Prisma.Decimal;

export interface OddsUpdate {
  selectionId: string;
  gameId: string;
  marketId: string;
  oldOdds: number;
  newOdds: number;
  movement: 'up' | 'down' | 'stable';
}

// The Odds API response types
interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number; // For spreads and totals
}

interface OddsApiMarket {
  key: string; // h2h, spreads, totals
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

// Market type mapping
const MARKET_TYPE_MAP: Record<string, string> = {
  h2h: 'moneyline',
  spreads: 'spread',
  totals: 'total',
};

export class OddsSyncService {
  // Sync odds for a specific game
  static async syncGameOdds(gameId: string, isLive: boolean = false) {
    try {
      console.log(`Syncing odds for game ${gameId} (${isLive ? 'LIVE' : 'PRE-LIVE'})`);

      // 1. Fetch game with markets and selections
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          markets: {
            where: { active: true },
            include: {
              selections: {
                where: { status: 'active' },
                include: { currentOdds: true },
              },
            },
          },
          sport: true,
          league: true,
          homeTeam: true,
          awayTeam: true,
        },
      });

      if (!game) {
        console.error(`Game ${gameId} not found`);
        return;
      }

      // 2. Fetch fresh odds from provider
      const freshOdds = await this.fetchOddsFromProvider(game);

      if (!freshOdds || freshOdds.length === 0) {
        console.log(`No odds data available for game ${gameId}`);
        return;
      }

      // 3. Compare and detect changes
      const updates: OddsUpdate[] = [];
      const cacheData: any[] = [];

      for (const market of game.markets) {
        for (const selection of market.selections) {
          const freshOdd = freshOdds.find(
            (o: any) => o.selectionId === selection.id
          );

          if (!freshOdd) continue;

          const oldOdds = selection.currentOdds?.currentOdds.toNumber() || selection.odds.toNumber();
          const newOdds = freshOdd.odds;

          // Detect significant change (> 1 cent)
          if (Math.abs(newOdds - oldOdds) > 0.01) {
            updates.push({
              selectionId: selection.id,
              gameId: game.id,
              marketId: market.id,
              oldOdds,
              newOdds,
              movement: newOdds > oldOdds ? 'up' : newOdds < oldOdds ? 'down' : 'stable',
            });
          }

          cacheData.push({
            selectionId: selection.id,
            gameId: game.id,
            marketId: market.id,
            odds: newOdds,
            previousOdds: oldOdds,
            movement: newOdds > oldOdds ? 'up' : newOdds < oldOdds ? 'down' : 'stable',
            timestamp: Date.now(),
          });
        }
      }

      // 4. Update database if there are changes
      if (updates.length > 0) {
        await this.updateOddsInDatabase(updates, isLive);
        console.log(`Updated ${updates.length} odds for game ${gameId}`);

        // 5. Publish changes via QStash
        for (const update of updates) {
          await OddsPubSub.publishOddsChange({
            gameId: update.gameId,
            selectionId: update.selectionId,
            oldOdds: update.oldOdds,
            newOdds: update.newOdds,
            timestamp: Date.now(),
          });
        }
      }

      // 6. Update Redis cache
      await OddsCache.cacheGameOdds(gameId, cacheData);

      // 7. Update sync status
      await prisma.oddsSyncStatus.upsert({
        where: { gameId },
        create: {
          gameId,
          lastSyncAt: new Date(),
          syncStatus: 'active',
          failureCount: 0,
        },
        update: {
          lastSyncAt: new Date(),
          failureCount: 0,
          lastError: null,
        },
      });

      // 8. Schedule next sync if live
      if (isLive && game.status === 'live') {
        await OddsPubSub.scheduleOddsSync(gameId, 2); // Schedule next sync in 2 seconds
      }

      return { success: true, updatesCount: updates.length };

    } catch (error) {
      console.error(`Error syncing odds for game ${gameId}:`, error);

      // Update sync status with error
      await prisma.oddsSyncStatus.upsert({
        where: { gameId },
        create: {
          gameId,
          syncStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          failureCount: 1,
        },
        update: {
          failureCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  // Fetch odds from The Odds API
  private static async fetchOddsFromProvider(game: any): Promise<{ selectionId: string; odds: number }[]> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      console.error('ODDS_API_KEY not configured');
      return [];
    }

    try {
      // Map sport code to The Odds API sport key
      const sportKey = this.mapSportCode(game.sport.code);

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
        const remaining = response.headers.get('x-requests-remaining');
        console.error(`Odds API error: ${response.status} ${response.statusText}, remaining: ${remaining}`);
        throw new Error(`Odds API error: ${response.statusText}`);
      }

      // Log API usage
      const requestsRemaining = response.headers.get('x-requests-remaining');
      const requestsUsed = response.headers.get('x-requests-used');
      console.log(`Odds API usage: ${requestsUsed} used, ${requestsRemaining} remaining`);

      const events: OddsApiEvent[] = await response.json();

      // Find the matching event for this game
      const matchingEvent = this.findMatchingEvent(events, game);

      if (!matchingEvent) {
        console.log(`No matching event found for game: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        return [];
      }

      // Extract odds from the preferred bookmaker
      return this.mapEventOddsToSelections(matchingEvent, game);

    } catch (error) {
      console.error('Failed to fetch odds from provider:', error);
      return [];
    }
  }

  // Map internal sport codes to The Odds API sport keys
  private static mapSportCode(code: string): string {
    const sportMap: Record<string, string> = {
      'NFL': 'americanfootball_nfl',
      'NBA': 'basketball_nba',
      'MLB': 'baseball_mlb',
      'NHL': 'icehockey_nhl',
      'NCAAF': 'americanfootball_ncaaf',
      'NCAAB': 'basketball_ncaab',
      'EPL': 'soccer_epl',
      'MLS': 'soccer_usa_mls',
      'UFC': 'mma_mixed_martial_arts',
      'TENNIS': 'tennis_atp_aus_open',
    };
    return sportMap[code.toUpperCase()] || code.toLowerCase();
  }

  // Find the matching event from API response
  private static findMatchingEvent(events: OddsApiEvent[], game: any): OddsApiEvent | undefined {
    const homeTeamName = game.homeTeam.name.toLowerCase();
    const awayTeamName = game.awayTeam.name.toLowerCase();
    const gameTime = new Date(game.scheduledStartAt).getTime();

    return events.find(event => {
      const eventHome = event.home_team.toLowerCase();
      const eventAway = event.away_team.toLowerCase();
      const eventTime = new Date(event.commence_time).getTime();

      // Match by team names (fuzzy matching)
      const homeMatch = this.fuzzyTeamMatch(homeTeamName, eventHome);
      const awayMatch = this.fuzzyTeamMatch(awayTeamName, eventAway);

      // Match within 2 hours of scheduled time
      const timeMatch = Math.abs(gameTime - eventTime) < 2 * 60 * 60 * 1000;

      return homeMatch && awayMatch && timeMatch;
    });
  }

  // Fuzzy team name matching
  private static fuzzyTeamMatch(ourTeam: string, apiTeam: string): boolean {
    // Direct match
    if (ourTeam === apiTeam) return true;

    // Contains match (e.g., "Chiefs" matches "Kansas City Chiefs")
    if (apiTeam.includes(ourTeam) || ourTeam.includes(apiTeam)) return true;

    // Last word match (team nickname)
    const ourWords = ourTeam.split(' ');
    const apiWords = apiTeam.split(' ');
    const ourLast = ourWords[ourWords.length - 1];
    const apiLast = apiWords[apiWords.length - 1];

    return ourLast === apiLast;
  }

  // Map API odds to our selections
  private static mapEventOddsToSelections(
    event: OddsApiEvent,
    game: any
  ): { selectionId: string; odds: number }[] {
    const results: { selectionId: string; odds: number }[] = [];

    // Use first available bookmaker or prefer specific ones
    const preferredBookmakers = ['fanduel', 'draftkings', 'betmgm', 'caesars'];
    const bookmaker = event.bookmakers.find(b =>
      preferredBookmakers.includes(b.key)
    ) || event.bookmakers[0];

    if (!bookmaker) {
      console.log('No bookmakers available for event');
      return [];
    }

    console.log(`Using bookmaker: ${bookmaker.title}`);

    for (const market of game.markets) {
      const apiMarketKey = this.getApiMarketKey(market.marketType);
      const apiMarket = bookmaker.markets.find(m => m.key === apiMarketKey);

      if (!apiMarket) continue;

      for (const selection of market.selections) {
        const matchedOdds = this.matchSelectionToOutcome(
          selection,
          apiMarket,
          event,
          game
        );

        if (matchedOdds !== null) {
          results.push({
            selectionId: selection.id,
            odds: this.americanToDecimal(matchedOdds),
          });
        }
      }
    }

    return results;
  }

  // Get API market key from our market type
  private static getApiMarketKey(marketType: string): string {
    const map: Record<string, string> = {
      moneyline: 'h2h',
      spread: 'spreads',
      total: 'totals',
    };
    return map[marketType.toLowerCase()] || marketType;
  }

  // Match our selection to API outcome
  private static matchSelectionToOutcome(
    selection: any,
    apiMarket: OddsApiMarket,
    event: OddsApiEvent,
    game: any
  ): number | null {
    const selectionName = selection.name.toLowerCase();

    for (const outcome of apiMarket.outcomes) {
      const outcomeName = outcome.name.toLowerCase();

      // Moneyline matching
      if (apiMarket.key === 'h2h') {
        if (this.fuzzyTeamMatch(selectionName, outcomeName)) {
          return outcome.price;
        }
        // Handle "Draw" for soccer
        if (selectionName.includes('draw') && outcomeName === 'draw') {
          return outcome.price;
        }
      }

      // Spread matching (includes point value)
      if (apiMarket.key === 'spreads') {
        // Match team name and check point value
        const isHomeTeam = this.fuzzyTeamMatch(game.homeTeam.name.toLowerCase(), outcomeName);
        const isAwayTeam = this.fuzzyTeamMatch(game.awayTeam.name.toLowerCase(), outcomeName);

        // Check if selection contains the team and the point
        if ((isHomeTeam || isAwayTeam) && outcome.point !== undefined) {
          const pointStr = outcome.point >= 0 ? `+${outcome.point}` : `${outcome.point}`;
          if (selectionName.includes(pointStr) || selectionName.includes(outcomeName)) {
            return outcome.price;
          }
        }
      }

      // Totals matching (Over/Under)
      if (apiMarket.key === 'totals') {
        const isOver = selectionName.includes('over') && outcomeName === 'over';
        const isUnder = selectionName.includes('under') && outcomeName === 'under';

        if ((isOver || isUnder) && outcome.point !== undefined) {
          // Check if the point value matches
          if (selectionName.includes(outcome.point.toString())) {
            return outcome.price;
          }
        }
      }
    }

    return null;
  }

  // Convert American odds to Decimal odds
  private static americanToDecimal(american: number): number {
    if (american >= 100) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  }

  // Update odds in database
  private static async updateOddsInDatabase(updates: OddsUpdate[], isLive: boolean) {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        // Update current odds
        await tx.currentOdds.upsert({
          where: { selectionId: update.selectionId },
          create: {
            selectionId: update.selectionId,
            currentOdds: new Decimal(update.newOdds),
            previousOdds: new Decimal(update.oldOdds),
            oddsMovement: update.movement,
            lastUpdatedAt: new Date(),
            syncedAt: new Date(),
          },
          update: {
            previousOdds: new Decimal(update.oldOdds),
            currentOdds: new Decimal(update.newOdds),
            oddsMovement: update.movement,
            lastUpdatedAt: new Date(),
            syncedAt: new Date(),
          },
        });

        // Create snapshot for significant changes or all live updates
        const changePercent = Math.abs((update.newOdds - update.oldOdds) / update.oldOdds * 100);
        if (isLive || changePercent > 5) {
          await tx.oddsSnapshot.create({
            data: {
              selectionId: update.selectionId,
              odds: new Decimal(update.newOdds),
              timestamp: new Date(),
              source: 'api',
            },
          });
        }

        // Create change event
        await tx.oddsChangeEvent.create({
          data: {
            selectionId: update.selectionId,
            gameId: update.gameId,
            oldOdds: new Decimal(update.oldOdds),
            newOdds: new Decimal(update.newOdds),
            changePercentage: new Decimal(changePercent),
            changeType: changePercent > 5 ? 'significant' : 'minor',
            broadcasted: false,
          },
        });
      }
    });
  }

  // Batch sync for multiple games
  static async syncMultipleGames(gameIds: string[], isLive: boolean = false) {
    const results = await Promise.allSettled(
      gameIds.map(gameId => this.syncGameOdds(gameId, isLive))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed, total: gameIds.length };
  }

  // Fetch raw odds from The Odds API for a sport (useful for debugging/seeding)
  static async fetchSportOdds(sportCode: string): Promise<OddsApiEvent[]> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }

    const sportKey = this.mapSportCode(sportCode);
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
      throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
    }

    const requestsRemaining = response.headers.get('x-requests-remaining');
    console.log(`Odds API requests remaining: ${requestsRemaining}`);

    return response.json();
  }

  // Get available sports from The Odds API
  static async fetchAvailableSports(): Promise<{ key: string; title: string; active: boolean }[]> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }

    const url = new URL('https://api.the-odds-api.com/v4/sports');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Odds API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}