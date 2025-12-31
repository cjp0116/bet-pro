// External API sync service - fetches from Odds API and caches results
import { GamesCache, type CachedGame } from './games-cache';

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

// Sport keys to fetch for featured/home page
const FEATURED_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'icehockey_nhl',
  'baseball_mlb',
];

// Map API sport keys to our internal sport IDs
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

// Map internal sport IDs to API sport keys
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

function getTeamAbbr(teamName: string): string {
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

function formatGameTime(commenceTime: string): string {
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

function extractOdds(bookmaker: OddsApiBookmaker) {
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

function transformEventToGame(event: OddsApiEvent): CachedGame | null {
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
    startTime: formatGameTime(event.commence_time),
    commenceTime: event.commence_time,
    homeTeam: {
      name: event.home_team,
      abbr: getTeamAbbr(event.home_team),
      logo: '/placeholder.svg',
      score: isLive ? Math.floor(Math.random() * 30) : undefined,
    },
    awayTeam: {
      name: event.away_team,
      abbr: getTeamAbbr(event.away_team),
      logo: '/placeholder.svg',
      score: isLive ? Math.floor(Math.random() * 30) : undefined,
    },
    odds: extractOdds(bookmaker),
    lastUpdated: new Date().toISOString(),
  };
}

export class ExternalOddsSync {
  // Fetch from Odds API and cache results - prioritizes freshness
  static async syncSport(sportId: string): Promise<{
    games: CachedGame[];
    fromCache: boolean;
    isStale: boolean;
    ageSeconds: number | null;
  }> {
    const cached = await GamesCache.getGames(sportId);
    const isStale = await GamesCache.isStale(sportId);
    const canSync = await GamesCache.canSync(sportId);
    const ageSeconds = await GamesCache.getTimeSinceSync(sportId);

    // If cache exists but is stale, and we can sync, fetch fresh data
    if (isStale && canSync) {
      const apiKeys = SPORT_ID_TO_API_KEYS[sportId] || [];
      if (apiKeys.length === 0) {
        console.error(`No API keys for sport: ${sportId}`);
        return { games: cached || [], fromCache: !!cached, isStale: true, ageSeconds };
      }

      console.log(`Fetching fresh odds for ${sportId} (cache age: ${ageSeconds}s)`);
      const games = await this.fetchFromOddsApi(apiKeys);

      if (games.length > 0) {
        await GamesCache.setGames(games, sportId);
        await GamesCache.markSynced(sportId);
        return { games, fromCache: false, isStale: false, ageSeconds: 0 };
      }

      // API returned no games, use cache if available
      if (cached) {
        return { games: cached, fromCache: true, isStale: true, ageSeconds };
      }
    }

    // Return cached data if available (even if stale, when rate limited)
    if (cached) {
      return { games: cached, fromCache: true, isStale, ageSeconds };
    }

    // No cache, must fetch
    const apiKeys = SPORT_ID_TO_API_KEYS[sportId] || [];
    if (apiKeys.length === 0) {
      return { games: [], fromCache: false, isStale: false, ageSeconds: null };
    }

    const games = await this.fetchFromOddsApi(apiKeys);
    if (games.length > 0) {
      await GamesCache.setGames(games, sportId);
      await GamesCache.markSynced(sportId);
    }

    return { games, fromCache: false, isStale: false, ageSeconds: 0 };
  }

  // Sync featured sports for home page - prioritizes freshness
  static async syncFeatured(): Promise<{
    games: CachedGame[];
    fromCache: boolean;
    isStale: boolean;
    ageSeconds: number | null;
  }> {
    const cached = await GamesCache.getGames();
    const isStale = await GamesCache.isStale();
    const canSync = await GamesCache.canSync();
    const ageSeconds = await GamesCache.getTimeSinceSync();

    // If cache is stale and we can sync, fetch fresh data
    if (isStale && canSync) {
      console.log(`Fetching fresh featured odds (cache age: ${ageSeconds}s)`);
      const games = await this.fetchFromOddsApi(FEATURED_SPORTS);

      if (games.length > 0) {
        const featured = games.slice(0, 12);
        await GamesCache.setGames(featured);
        await GamesCache.markSynced();
        return { games: featured, fromCache: false, isStale: false, ageSeconds: 0 };
      }

      if (cached) {
        return { games: cached, fromCache: true, isStale: true, ageSeconds };
      }
    }

    // Return cached data if available
    if (cached) {
      return { games: cached, fromCache: true, isStale, ageSeconds };
    }

    // No cache, must fetch
    const games = await this.fetchFromOddsApi(FEATURED_SPORTS);
    if (games.length > 0) {
      const featured = games.slice(0, 12);
      await GamesCache.setGames(featured);
      await GamesCache.markSynced();
      return { games: featured, fromCache: false, isStale: false, ageSeconds: 0 };
    }

    return { games: [], fromCache: false, isStale: false, ageSeconds: null };
  }

  // Core fetch logic
  private static async fetchFromOddsApi(sportKeys: string[]): Promise<CachedGame[]> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      console.error('ODDS_API_KEY not configured');
      return [];
    }

    const allGames: CachedGame[] = [];

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
          console.error(`Odds API error for ${sportKey}: ${response.status}`);
          continue;
        }

        // Log API usage
        const remaining = response.headers.get('x-requests-remaining');
        console.log(`Odds API: ${sportKey} fetched, ${remaining} requests remaining`);

        const events: OddsApiEvent[] = await response.json();

        for (const event of events) {
          const game = transformEventToGame(event);
          if (game) {
            allGames.push(game);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${sportKey}:`, error);
      }
    }

    // Sort by commence time
    allGames.sort((a, b) =>
      new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
    );

    return allGames;
  }

  // Get available sport IDs
  static getSupportedSports(): string[] {
    return Object.keys(SPORT_ID_TO_API_KEYS);
  }
}

