import { featuredGames, sports, type Game } from "./betting-data"

export interface SearchResult {
  id: string
  type: "game" | "team" | "player" | "league"
  title: string
  subtitle?: string
  sport?: string
  league?: string
  gameId?: string
  game?: Game
}

// Simulated team database
export const teams = [
  { name: "Kansas City Chiefs", abbr: "KC", sport: "football", league: "NFL" },
  { name: "Buffalo Bills", abbr: "BUF", sport: "football", league: "NFL" },
  { name: "Philadelphia Eagles", abbr: "PHI", sport: "football", league: "NFL" },
  { name: "Dallas Cowboys", abbr: "DAL", sport: "football", league: "NFL" },
  { name: "San Francisco 49ers", abbr: "SF", sport: "football", league: "NFL" },
  { name: "Miami Dolphins", abbr: "MIA", sport: "football", league: "NFL" },
  { name: "Los Angeles Lakers", abbr: "LAL", sport: "basketball", league: "NBA" },
  { name: "Boston Celtics", abbr: "BOS", sport: "basketball", league: "NBA" },
  { name: "Golden State Warriors", abbr: "GSW", sport: "basketball", league: "NBA" },
  { name: "Phoenix Suns", abbr: "PHX", sport: "basketball", league: "NBA" },
  { name: "Denver Nuggets", abbr: "DEN", sport: "basketball", league: "NBA" },
  { name: "Milwaukee Bucks", abbr: "MIL", sport: "basketball", league: "NBA" },
  { name: "Toronto Maple Leafs", abbr: "TOR", sport: "hockey", league: "NHL" },
  { name: "Montreal Canadiens", abbr: "MTL", sport: "hockey", league: "NHL" },
  { name: "Manchester United", abbr: "MUN", sport: "soccer", league: "EPL" },
  { name: "Liverpool", abbr: "LIV", sport: "soccer", league: "EPL" },
  { name: "Arsenal", abbr: "ARS", sport: "soccer", league: "EPL" },
  { name: "Manchester City", abbr: "MCI", sport: "soccer", league: "EPL" },
]

// Simulated player database
export const players = [
  { name: "Patrick Mahomes", team: "Kansas City Chiefs", sport: "football", league: "NFL" },
  { name: "Josh Allen", team: "Buffalo Bills", sport: "football", league: "NFL" },
  { name: "Jalen Hurts", team: "Philadelphia Eagles", sport: "football", league: "NFL" },
  { name: "LeBron James", team: "Los Angeles Lakers", sport: "basketball", league: "NBA" },
  { name: "Jayson Tatum", team: "Boston Celtics", sport: "basketball", league: "NBA" },
  { name: "Stephen Curry", team: "Golden State Warriors", sport: "basketball", league: "NBA" },
  { name: "Kevin Durant", team: "Phoenix Suns", sport: "basketball", league: "NBA" },
  { name: "Auston Matthews", team: "Toronto Maple Leafs", sport: "hockey", league: "NHL" },
  { name: "Mohamed Salah", team: "Liverpool", sport: "soccer", league: "EPL" },
  { name: "Erling Haaland", team: "Manchester City", sport: "soccer", league: "EPL" },
]

export function searchAll(query: string): SearchResult[] {
  if (!query || query.length < 2) return []

  const normalizedQuery = query.toLowerCase()
  const results: SearchResult[] = []

  // Search games
  featuredGames.forEach((game) => {
    const matchesHome = game.homeTeam.name.toLowerCase().includes(normalizedQuery)
    const matchesAway = game.awayTeam.name.toLowerCase().includes(normalizedQuery)
    const matchesLeague = game.league.toLowerCase().includes(normalizedQuery)

    if (matchesHome || matchesAway || matchesLeague) {
      results.push({
        id: `game-${game.id}`,
        type: "game",
        title: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
        subtitle: `${game.league} • ${game.startTime}`,
        sport: game.sport,
        league: game.league,
        gameId: game.id,
        game,
      })
    }
  })

  // Search teams
  teams.forEach((team) => {
    if (team.name.toLowerCase().includes(normalizedQuery) || team.abbr.toLowerCase().includes(normalizedQuery)) {
      // Find games for this team
      const teamGames = featuredGames.filter((g) => g.homeTeam.abbr === team.abbr || g.awayTeam.abbr === team.abbr)

      results.push({
        id: `team-${team.abbr}`,
        type: "team",
        title: team.name,
        subtitle: `${team.league} • ${teamGames.length} upcoming game${teamGames.length !== 1 ? "s" : ""}`,
        sport: team.sport,
        league: team.league,
      })
    }
  })

  // Search players
  players.forEach((player) => {
    if (player.name.toLowerCase().includes(normalizedQuery)) {
      results.push({
        id: `player-${player.name.replace(/\s+/g, "-").toLowerCase()}`,
        type: "player",
        title: player.name,
        subtitle: `${player.team} • ${player.league}`,
        sport: player.sport,
        league: player.league,
      })
    }
  })

  // Search leagues
  sports.forEach((sport) => {
    sport.leagues.forEach((league) => {
      if (league.toLowerCase().includes(normalizedQuery)) {
        const leagueGames = featuredGames.filter((g) => g.league === league)
        results.push({
          id: `league-${league}`,
          type: "league",
          title: league,
          subtitle: `${sport.name} • ${leagueGames.length} game${leagueGames.length !== 1 ? "s" : ""} available`,
          sport: sport.id,
          league,
        })
      }
    })
  })

  return results.slice(0, 20)
}
