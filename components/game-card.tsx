"use client"

import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Game, BetSelection } from "@/lib/betting-data"
import { formatOdds } from "@/lib/betting-data"
import { Clock, Zap, CheckCircle2 } from "lucide-react"

interface GameCardProps {
  game: Game
  selectedBets: BetSelection[]
  onSelectBet: (bet: BetSelection) => void
}

export const GameCard = memo(function GameCard({ game, selectedBets, onSelectBet }: GameCardProps) {
  // Memoize selected bet IDs for this game to avoid recalculating on every render
  const selectedBetIds = useMemo(() => {
    return new Set(
      selectedBets
        .filter(bet => bet.gameId === game.id)
        .map(bet => `${bet.type}-${bet.selection}`)
    )
  }, [selectedBets, game.id])
  const isSelected = (type: string, selection: string) => {
    return selectedBetIds.has(`${type}-${selection}`)
  }

  const handleBetClick = (
    type: "spread" | "moneyline" | "total",
    selection: string,
    odds: number,
    team?: string,
    line?: string,
  ) => {
    const bet: BetSelection = {
      id: `${game.id}-${type}-${selection}`,
      gameId: game.id,
      type,
      selection,
      odds,
      team,
      line,
    }
    onSelectBet(bet)
  }

  // Check if we have scores to display
  const hasScores = game.homeTeam.score !== undefined || game.awayTeam.score !== undefined
  const showScores = hasScores && (game.status === "live" || game.status === "finished")

  // Determine winning team for finished games
  const homeWinning = showScores && (game.homeTeam.score ?? 0) > (game.awayTeam.score ?? 0)
  const awayWinning = showScores && (game.awayTeam.score ?? 0) > (game.homeTeam.score ?? 0)

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80",
      game.status === "finished" && "opacity-75"
    )}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{game.league}</span>
          {game.status === "live" && (
            <span className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-500">
              <Zap className="h-3 w-3" />
              Live
            </span>
          )}
          {game.status === "finished" && (
            <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Final
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {game.status === "live"
            ? (game.gameTime || `${game.quarter || ''} ${game.clock || ''}`.trim() || 'In Progress')
            : game.status === "finished"
              ? "Final"
              : game.startTime}
        </div>
      </div>

      {/* Teams */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              loading='lazy'
              src={game.awayTeam.logo || "/placeholder.svg"}
              alt={game.awayTeam.name}
              className="h-8 w-8 rounded"
            />
            <span className={cn(
              "font-medium",
              game.status === "finished" && awayWinning && "font-bold"
            )}>{game.awayTeam.name}</span>
          </div>
          {showScores && (
            <span className={cn(
              "text-lg font-bold tabular-nums",
              game.status === "finished" && awayWinning && "text-green-500",
              game.status === "live" && "text-red-500"
            )}>
              {game.awayTeam.score ?? 0}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              loading='lazy'
              src={game.homeTeam.logo || "/placeholder.svg"}
              alt={game.homeTeam.name}
              className="h-8 w-8 rounded"
            />
            <span className={cn(
              "font-medium",
              game.status === "finished" && homeWinning && "font-bold"
            )}>{game.homeTeam.name}</span>
          </div>
          {showScores && (
            <span className={cn(
              "text-lg font-bold tabular-nums",
              game.status === "finished" && homeWinning && "text-green-500",
              game.status === "live" && "text-red-500"
            )}>
              {game.homeTeam.score ?? 0}
            </span>
          )}
        </div>
      </div>

      {/* Odds Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Spread */}
        <div className="space-y-1">
          <span className="block text-center text-[10px] font-medium uppercase text-muted-foreground">Spread</span>
          <button
            onClick={() =>
              handleBetClick("spread", "away", game.odds.spread.awayOdds, game.awayTeam.abbr, game.odds.spread.away)
            }
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("spread", "away") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-xs font-semibold">{game.odds.spread.away}</span>
            <span className="block text-[10px] text-muted-foreground">{formatOdds(game.odds.spread.awayOdds)}</span>
          </button>
          <button
            onClick={() =>
              handleBetClick("spread", "home", game.odds.spread.homeOdds, game.homeTeam.abbr, game.odds.spread.home)
            }
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("spread", "home") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-xs font-semibold">{game.odds.spread.home}</span>
            <span className="block text-[10px] text-muted-foreground">{formatOdds(game.odds.spread.homeOdds)}</span>
          </button>
        </div>

        {/* Moneyline */}
        <div className="space-y-1">
          <span className="block text-center text-[10px] font-medium uppercase text-muted-foreground">Moneyline</span>
          <button
            onClick={() => handleBetClick("moneyline", "away", game.odds.moneyline.away, game.awayTeam.abbr)}
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("moneyline", "away") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-sm font-semibold">{formatOdds(game.odds.moneyline.away)}</span>
          </button>
          <button
            onClick={() => handleBetClick("moneyline", "home", game.odds.moneyline.home, game.homeTeam.abbr)}
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("moneyline", "home") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-sm font-semibold">{formatOdds(game.odds.moneyline.home)}</span>
          </button>
        </div>

        {/* Total */}
        <div className="space-y-1">
          <span className="block text-center text-[10px] font-medium uppercase text-muted-foreground">Total</span>
          <button
            onClick={() =>
              handleBetClick("total", "over", game.odds.total.over, undefined, `O ${game.odds.total.line}`)
            }
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("total", "over") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-xs font-semibold">O {game.odds.total.line}</span>
            <span className="block text-[10px] text-muted-foreground">{formatOdds(game.odds.total.over)}</span>
          </button>
          <button
            onClick={() =>
              handleBetClick("total", "under", game.odds.total.under, undefined, `U ${game.odds.total.line}`)
            }
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected("total", "under") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-xs font-semibold">U {game.odds.total.line}</span>
            <span className="block text-[10px] text-muted-foreground">{formatOdds(game.odds.total.under)}</span>
          </button>
        </div>
      </div>
    </div>
  )
})

// Custom comparison function for memo - only re-render if game data or relevant selections changed
GameCard.displayName = 'GameCard'
