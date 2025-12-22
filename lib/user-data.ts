export interface Transaction {
  id: string
  type: "deposit" | "withdrawal" | "bet_placed" | "bet_won" | "bet_lost" | "bonus"
  amount: number
  balance: number
  description: string
  date: string
  status: "completed" | "pending" | "failed"
  method?: string
}

export interface UserBet {
  id: string
  type: "single" | "parlay"
  status: "pending" | "won" | "lost" | "cashout"
  stake: number
  potentialWin: number
  actualWin?: number
  placedAt: string
  settledAt?: string
  selections: {
    id: string
    gameId: string
    sport: string
    league: string
    matchup: string
    betType: "spread" | "moneyline" | "total"
    selection: string
    odds: number
    status: "pending" | "won" | "lost"
  }[]
}

export const transactions: Transaction[] = [
  {
    id: "txn-001",
    type: "deposit",
    amount: 500,
    balance: 1750,
    description: "Deposit via Visa ****4582",
    date: "2024-12-22T14:30:00Z",
    status: "completed",
    method: "Visa",
  },
  {
    id: "txn-002",
    type: "bet_won",
    amount: 182.5,
    balance: 1250,
    description: "Won: Chiefs -3.5 vs Bills",
    date: "2024-12-21T22:15:00Z",
    status: "completed",
  },
  {
    id: "txn-003",
    type: "bet_placed",
    amount: -100,
    balance: 1067.5,
    description: "Bet: Lakers vs Celtics - Lakers ML",
    date: "2024-12-21T19:45:00Z",
    status: "completed",
  },
  {
    id: "txn-004",
    type: "bet_lost",
    amount: -75,
    balance: 1167.5,
    description: "Lost: Warriors -4.5 vs Suns",
    date: "2024-12-20T23:30:00Z",
    status: "completed",
  },
  {
    id: "txn-005",
    type: "bonus",
    amount: 50,
    balance: 1242.5,
    description: "Welcome Bonus - First Deposit Match",
    date: "2024-12-20T10:00:00Z",
    status: "completed",
  },
  {
    id: "txn-006",
    type: "withdrawal",
    amount: -200,
    balance: 1192.5,
    description: "Withdrawal to Bank ****7891",
    date: "2024-12-19T16:20:00Z",
    status: "completed",
    method: "Bank Transfer",
  },
  {
    id: "txn-007",
    type: "deposit",
    amount: 300,
    balance: 1392.5,
    description: "Deposit via PayPal",
    date: "2024-12-18T09:15:00Z",
    status: "completed",
    method: "PayPal",
  },
  {
    id: "txn-008",
    type: "bet_won",
    amount: 275,
    balance: 1092.5,
    description: "Won: 3-Leg Parlay (NFL)",
    date: "2024-12-17T23:45:00Z",
    status: "completed",
  },
  {
    id: "txn-009",
    type: "withdrawal",
    amount: -150,
    balance: 817.5,
    description: "Withdrawal to Visa ****4582",
    date: "2024-12-16T11:30:00Z",
    status: "pending",
    method: "Visa",
  },
]

export const userBets: UserBet[] = [
  {
    id: "bet-001",
    type: "single",
    status: "pending",
    stake: 100,
    potentialWin: 190.91,
    placedAt: "2024-12-22T15:30:00Z",
    selections: [
      {
        id: "sel-001",
        gameId: "1",
        sport: "football",
        league: "NFL",
        matchup: "Buffalo Bills @ Kansas City Chiefs",
        betType: "spread",
        selection: "Chiefs -3.5",
        odds: -110,
        status: "pending",
      },
    ],
  },
  {
    id: "bet-002",
    type: "parlay",
    status: "pending",
    stake: 50,
    potentialWin: 364.5,
    placedAt: "2024-12-22T14:00:00Z",
    selections: [
      {
        id: "sel-002a",
        gameId: "2",
        sport: "basketball",
        league: "NBA",
        matchup: "Boston Celtics @ Los Angeles Lakers",
        betType: "moneyline",
        selection: "Celtics ML",
        odds: -190,
        status: "pending",
      },
      {
        id: "sel-002b",
        gameId: "4",
        sport: "basketball",
        league: "NBA",
        matchup: "Phoenix Suns @ Golden State Warriors",
        betType: "spread",
        selection: "Warriors -2.5",
        odds: -110,
        status: "pending",
      },
      {
        id: "sel-002c",
        gameId: "5",
        sport: "hockey",
        league: "NHL",
        matchup: "Montreal Canadiens @ Toronto Maple Leafs",
        betType: "total",
        selection: "Over 6.5",
        odds: -115,
        status: "pending",
      },
    ],
  },
  {
    id: "bet-003",
    type: "single",
    status: "won",
    stake: 75,
    potentialWin: 182.5,
    actualWin: 182.5,
    placedAt: "2024-12-21T18:00:00Z",
    settledAt: "2024-12-21T22:15:00Z",
    selections: [
      {
        id: "sel-003",
        gameId: "prev-1",
        sport: "football",
        league: "NFL",
        matchup: "Miami Dolphins @ New York Jets",
        betType: "moneyline",
        selection: "Dolphins ML",
        odds: +145,
        status: "won",
      },
    ],
  },
  {
    id: "bet-004",
    type: "single",
    status: "lost",
    stake: 100,
    potentialWin: 195.45,
    placedAt: "2024-12-20T20:30:00Z",
    settledAt: "2024-12-20T23:30:00Z",
    selections: [
      {
        id: "sel-004",
        gameId: "prev-2",
        sport: "basketball",
        league: "NBA",
        matchup: "Phoenix Suns @ Golden State Warriors",
        betType: "spread",
        selection: "Warriors -4.5",
        odds: -105,
        status: "lost",
      },
    ],
  },
  {
    id: "bet-005",
    type: "parlay",
    status: "won",
    stake: 25,
    potentialWin: 275,
    actualWin: 275,
    placedAt: "2024-12-17T12:00:00Z",
    settledAt: "2024-12-17T23:45:00Z",
    selections: [
      {
        id: "sel-005a",
        gameId: "prev-3",
        sport: "football",
        league: "NFL",
        matchup: "Green Bay Packers @ Chicago Bears",
        betType: "spread",
        selection: "Packers -7.5",
        odds: -110,
        status: "won",
      },
      {
        id: "sel-005b",
        gameId: "prev-4",
        sport: "football",
        league: "NFL",
        matchup: "San Francisco 49ers @ Seattle Seahawks",
        betType: "moneyline",
        selection: "49ers ML",
        odds: -145,
        status: "won",
      },
      {
        id: "sel-005c",
        gameId: "prev-5",
        sport: "football",
        league: "NFL",
        matchup: "Baltimore Ravens @ Cleveland Browns",
        betType: "total",
        selection: "Under 44.5",
        odds: -110,
        status: "won",
      },
    ],
  },
  {
    id: "bet-006",
    type: "single",
    status: "lost",
    stake: 50,
    potentialWin: 140,
    placedAt: "2024-12-15T14:00:00Z",
    settledAt: "2024-12-15T17:00:00Z",
    selections: [
      {
        id: "sel-006",
        gameId: "prev-6",
        sport: "soccer",
        league: "EPL",
        matchup: "Arsenal vs Manchester City",
        betType: "moneyline",
        selection: "Arsenal ML",
        odds: +180,
        status: "lost",
      },
    ],
  },
]

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`
}
