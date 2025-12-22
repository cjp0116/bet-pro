"use client"

import { useState } from "react"
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BetSelection } from "@/lib/betting-data"
import { formatOdds, calculatePayout, featuredGames } from "@/lib/betting-data"
import { BetConfirmationModal } from "@/components/bet-confirmation-modal"

interface BetSlipProps {
  selections: BetSelection[]
  onRemove: (id: string) => void
  onClear: () => void
  balance: number
}

export function BetSlip({ selections, onRemove, onClear, balance }: BetSlipProps) {
  const [stakes, setStakes] = useState<Record<string, string>>({})
  const [isExpanded, setIsExpanded] = useState(true)
  const [betType, setBetType] = useState<"single" | "parlay">("single")
  const [showConfirmation, setShowConfirmation] = useState(false)

  const getGameForBet = (gameId: string) => {
    return featuredGames.find((g) => g.id === gameId)
  }

  const updateStake = (id: string, value: string) => {
    setStakes((prev) => ({ ...prev, [id]: value }))
  }

  const getTotalStake = () => {
    if (betType === "parlay") {
      return Number.parseFloat(stakes["parlay"] || "0")
    }
    return Object.values(stakes).reduce((sum, val) => sum + (Number.parseFloat(val) || 0), 0)
  }

  const getParlayOdds = () => {
    if (selections.length === 0) return 0
    const decimalOdds = selections.map((sel) => {
      if (sel.odds > 0) return 1 + sel.odds / 100
      return 1 + 100 / Math.abs(sel.odds)
    })
    const combinedOdds = decimalOdds.reduce((acc, odds) => acc * odds, 1)
    if (combinedOdds >= 2) return Math.round((combinedOdds - 1) * 100)
    return Math.round(-100 / (combinedOdds - 1))
  }

  const getTotalPotentialWin = () => {
    if (betType === "parlay") {
      const parlayStake = Number.parseFloat(stakes["parlay"] || "0")
      if (parlayStake === 0) return 0
      return calculatePayout(parlayStake, getParlayOdds())
    }
    return selections.reduce((sum, sel) => {
      const stake = Number.parseFloat(stakes[sel.id] || "0")
      if (stake === 0) return sum
      return sum + calculatePayout(stake, sel.odds)
    }, 0)
  }

  const handleBetPlaced = () => {
    setStakes({})
    onClear()
  }

  if (selections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mb-3 text-4xl">🎯</div>
        <h3 className="font-semibold">Bet Slip Empty</h3>
        <p className="mt-1 text-sm text-muted-foreground">Click on odds to add selections</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">Bet Slip</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {selections.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Bet Type Tabs */}
            {selections.length > 1 && (
              <div className="flex border-b border-border">
                <button
                  onClick={() => setBetType("single")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    betType === "single"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Singles ({selections.length})
                </button>
                <button
                  onClick={() => setBetType("parlay")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    betType === "parlay"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Parlay
                </button>
              </div>
            )}

            {/* Selections */}
            <div className="max-h-64 overflow-y-auto">
              {selections.map((selection) => {
                const game = getGameForBet(selection.gameId)
                return (
                  <div key={selection.id} className="border-b border-border p-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize text-muted-foreground">{selection.type}</span>
                          <span className="font-semibold text-primary">{formatOdds(selection.odds)}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-medium truncate">
                          {selection.team && `${selection.team} `}
                          {selection.line}
                        </p>
                        {game && (
                          <p className="text-xs text-muted-foreground truncate">
                            {game.awayTeam.abbr} @ {game.homeTeam.abbr}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(selection.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label="Remove selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {betType === "single" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={stakes[selection.id] || ""}
                            onChange={(e) => updateStake(selection.id, e.target.value)}
                            className="pl-7 h-9 bg-secondary"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Win</span>
                          <p className="text-sm font-semibold text-primary">
                            $
                            {calculatePayout(Number.parseFloat(stakes[selection.id] || "0"), selection.odds).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Parlay Stake Input */}
            {betType === "parlay" && (
              <div className="border-t border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Parlay Odds</span>
                  <span className="font-semibold text-primary">{formatOdds(getParlayOdds())}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={stakes["parlay"] || ""}
                      onChange={(e) => updateStake("parlay", e.target.value)}
                      className="pl-7 h-9 bg-secondary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Stake</span>
                <span className="font-semibold">${getTotalStake().toFixed(2)}</span>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="text-lg font-bold text-primary">${getTotalPotentialWin().toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={getTotalStake() === 0 || getTotalStake() > balance}
                onClick={() => setShowConfirmation(true)}
              >
                {getTotalStake() > balance ? "Insufficient Balance" : "Place Bet"}
              </Button>
            </div>
          </>
        )}
      </div>

      <BetConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        selections={selections}
        betType={betType}
        stakes={stakes}
        parlayOdds={getParlayOdds()}
        totalStake={getTotalStake()}
        potentialWin={getTotalPotentialWin()}
        onBetPlaced={handleBetPlaced}
      />
    </>
  )
}
