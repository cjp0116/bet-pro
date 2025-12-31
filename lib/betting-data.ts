export interface Team {
  name: string
  abbr: string
  logo: string
  score?: number
}

export interface Game {
  id: string
  sport: string
  league: string
  status: "upcoming" | "live" | "finished"
  startTime: string
  commenceTime?: string // ISO timestamp
  quarter?: string
  clock?: string
  gameTime?: string // e.g., "Q3 5:42", "2nd Half"
  completed?: boolean
  lastScoreUpdate?: string // ISO timestamp
  homeTeam: Team
  awayTeam: Team
  odds: {
    spread: { home: string; away: string; homeOdds: number; awayOdds: number }
    moneyline: { home: number; away: number }
    total: { line: number; over: number; under: number }
  }
}

export interface BetSelection {
  id: string
  gameId: string
  type: "spread" | "moneyline" | "total"
  selection: string
  odds: number
  team?: string
  line?: string
}

export const sports = [
  { id: "football", name: "Football", icon: "🏈", leagues: ["NFL", "NCAAF"] },
  { id: "basketball", name: "Basketball", icon: "🏀", leagues: ["NBA", "NCAAB"] },
  { id: "baseball", name: "Baseball", icon: "⚾", leagues: ["MLB"] },
  { id: "hockey", name: "Hockey", icon: "🏒", leagues: ["NHL"] },
  { id: "soccer", name: "Soccer", icon: "⚽", leagues: ["EPL", "MLS", "La Liga"] },
  { id: "mma", name: "MMA", icon: "🥊", leagues: ["UFC", "Bellator"] },
  { id: "tennis", name: "Tennis", icon: "🎾", leagues: ["ATP", "WTA"] },
  { id: "golf", name: "Golf", icon: "⛳", leagues: ["PGA"] },
]

export const featuredGames: Game[] = [
  {
    id: "1",
    sport: "football",
    league: "NFL",
    status: "live",
    startTime: "8:20 PM",
    quarter: "3rd",
    clock: "5:42",
    homeTeam: { name: "Kansas City Chiefs", abbr: "KC", logo: "/generic-football-team-logo.png", score: 21 },
    awayTeam: { name: "Buffalo Bills", abbr: "BUF", logo: "/buffalo-silhouette-logo.png", score: 17 },
    odds: {
      spread: { home: "-3.5", away: "+3.5", homeOdds: -110, awayOdds: -110 },
      moneyline: { home: -165, away: +145 },
      total: { line: 51.5, over: -110, under: -110 },
    },
  },
  {
    id: "2",
    sport: "basketball",
    league: "NBA",
    status: "live",
    startTime: "7:30 PM",
    quarter: "2nd",
    clock: "3:15",
    homeTeam: { name: "Los Angeles Lakers", abbr: "LAL", logo: "/lakers-logo.jpg", score: 58 },
    awayTeam: { name: "Boston Celtics", abbr: "BOS", logo: "/celtics-logo.png", score: 62 },
    odds: {
      spread: { home: "+4.5", away: "-4.5", homeOdds: -110, awayOdds: -110 },
      moneyline: { home: +165, away: -190 },
      total: { line: 228.5, over: -110, under: -110 },
    },
  },
  {
    id: "3",
    sport: "football",
    league: "NFL",
    status: "upcoming",
    startTime: "Sun 1:00 PM",
    homeTeam: { name: "Philadelphia Eagles", abbr: "PHI", logo: "/stylized-eagle-emblem.png" },
    awayTeam: { name: "Dallas Cowboys", abbr: "DAL", logo: "/cowboys-logo.jpg" },
    odds: {
      spread: { home: "-6.5", away: "+6.5", homeOdds: -110, awayOdds: -110 },
      moneyline: { home: -275, away: +225 },
      total: { line: 45.5, over: -105, under: -115 },
    },
  },
  {
    id: "4",
    sport: "basketball",
    league: "NBA",
    status: "upcoming",
    startTime: "Tonight 10:00 PM",
    homeTeam: { name: "Golden State Warriors", abbr: "GSW", logo: "/generic-warrior-logo.png" },
    awayTeam: { name: "Phoenix Suns", abbr: "PHX", logo: "/stylized-phoenix-basketball.png" },
    odds: {
      spread: { home: "-2.5", away: "+2.5", homeOdds: -110, awayOdds: -110 },
      moneyline: { home: -135, away: +115 },
      total: { line: 234.5, over: -110, under: -110 },
    },
  },
  {
    id: "5",
    sport: "hockey",
    league: "NHL",
    status: "upcoming",
    startTime: "Tomorrow 7:00 PM",
    homeTeam: { name: "Toronto Maple Leafs", abbr: "TOR", logo: "/maple-leafs-logo.png" },
    awayTeam: { name: "Montreal Canadiens", abbr: "MTL", logo: "/canadiens-logo.jpg" },
    odds: {
      spread: { home: "-1.5", away: "+1.5", homeOdds: +135, awayOdds: -155 },
      moneyline: { home: -180, away: +155 },
      total: { line: 6.5, over: -115, under: -105 },
    },
  },
  {
    id: "6",
    sport: "soccer",
    league: "EPL",
    status: "upcoming",
    startTime: "Sat 12:30 PM",
    homeTeam: { name: "Manchester United", abbr: "MUN", logo: "/manchester-united-crest.png" },
    awayTeam: { name: "Liverpool", abbr: "LIV", logo: "/liverpool-crest.png" },
    odds: {
      spread: { home: "+0.5", away: "-0.5", homeOdds: -105, awayOdds: -115 },
      moneyline: { home: +210, away: +125 },
      total: { line: 2.5, over: -120, under: +100 },
    },
  },
]

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`
}

export function calculatePayout(stake: number, odds: number): number {
  if (odds > 0) {
    return stake + (stake * odds) / 100
  } else {
    return stake + (stake * 100) / Math.abs(odds)
  }
}
