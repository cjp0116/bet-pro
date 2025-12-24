"use client"

import { cn } from "@/lib/utils"
import type { Game, BetSelection } from "@/lib/betting-data"
import { formatOdds } from "@/lib/betting-data"
import { Clock, Zap } from "lucide-react"
import Image from 'next/image'
interface GameCardProps {
  game: Game
  selectedBets: BetSelection[]
  onSelectBet: (bet: BetSelection) => void
}

export function GameCard({ game, selectedBets, onSelectBet }: GameCardProps) {
  const isSelected = (gameId: string, type: string, selection: string) => {
    return selectedBets.some((bet) => bet.gameId === gameId && bet.type === type && bet.selection === selection)
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

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{game.league}</span>
          {game.status === "live" && (
            <span className="flex items-center gap-1 rounded bg-(--live)/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-live">
              <Zap className="h-3 w-3" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {game.status === "live" ? `${game.quarter} ${game.clock}` : game.startTime}
        </div>
      </div>

      {/* Teams */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              placeholder='blur'
              loading='lazy'
              src={game.awayTeam.logo || "/placeholder.svg"}
              alt={game.awayTeam.name}
              className="h-8 w-8 rounded"
            />
            <span className="font-medium">{game.awayTeam.name}</span>
          </div>
          {game.status === "live" && <span className="text-lg font-bold">{game.awayTeam.score}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              placeholder='blur'
              loading='lazy'
              src={game.homeTeam.logo || "/placeholder.svg"}
              alt={game.homeTeam.name}
              className="h-8 w-8 rounded"
            />
            <span className="font-medium">{game.homeTeam.name}</span>
          </div>
          {game.status === "live" && <span className="text-lg font-bold">{game.homeTeam.score}</span>}
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
              isSelected(game.id, "spread", "away") && "border-primary bg-primary/10",
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
              isSelected(game.id, "spread", "home") && "border-primary bg-primary/10",
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
              isSelected(game.id, "moneyline", "away") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-sm font-semibold">{formatOdds(game.odds.moneyline.away)}</span>
          </button>
          <button
            onClick={() => handleBetClick("moneyline", "home", game.odds.moneyline.home, game.homeTeam.abbr)}
            className={cn(
              "w-full rounded-lg border border-border bg-secondary p-2 text-center transition-all hover:border-primary/50 hover:bg-secondary/80",
              isSelected(game.id, "moneyline", "home") && "border-primary bg-primary/10",
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
              isSelected(game.id, "total", "over") && "border-primary bg-primary/10",
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
              isSelected(game.id, "total", "under") && "border-primary bg-primary/10",
            )}
          >
            <span className="block text-xs font-semibold">U {game.odds.total.line}</span>
            <span className="block text-[10px] text-muted-foreground">{formatOdds(game.odds.total.under)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
