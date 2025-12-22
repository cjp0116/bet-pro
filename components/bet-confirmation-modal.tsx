"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { BetSelection } from "@/lib/betting-data"
import { formatOdds, featuredGames } from "@/lib/betting-data"

type BetStatus = "confirming" | "processing" | "success" | "error"

interface BetConfirmationModalProps {
  open: boolean
  onClose: () => void
  selections: BetSelection[]
  betType: "single" | "parlay"
  stakes: Record<string, string>
  parlayOdds: number
  totalStake: number
  potentialWin: number
  onBetPlaced: () => void
}

export function BetConfirmationModal({
  open,
  onClose,
  selections,
  betType,
  stakes,
  parlayOdds,
  totalStake,
  potentialWin,
  onBetPlaced,
}: BetConfirmationModalProps) {
  const [status, setStatus] = useState<BetStatus>("confirming")
  const [betId, setBetId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStatus("confirming")
      setBetId(null)
    }
  }, [open])

  const getGameForBet = (gameId: string) => {
    return featuredGames.find((g) => g.id === gameId)
  }

  const handleConfirmBet = async () => {
    setStatus("processing")

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 90% success rate for demo
    const success = Math.random() > 0.1

    if (success) {
      setBetId(`BET-${Date.now().toString(36).toUpperCase()}`)
      setStatus("success")
      onBetPlaced()
    } else {
      setStatus("error")
    }
  }

  const handleClose = () => {
    if (status !== "processing") {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {status === "confirming" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Your Bet</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {betType === "parlay"
                      ? "Parlay"
                      : `${selections.length} Selection${selections.length > 1 ? "s" : ""}`}
                  </span>
                  {betType === "parlay" && <span className="font-semibold text-primary">{formatOdds(parlayOdds)}</span>}
                </div>

                <div className="space-y-3">
                  {selections.map((selection) => {
                    const game = getGameForBet(selection.gameId)
                    return (
                      <div key={selection.id} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {selection.team && `${selection.team} `}
                            {selection.line}
                          </p>
                          {game && (
                            <p className="text-xs text-muted-foreground">
                              {game.awayTeam.name} @ {game.homeTeam.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-primary">{formatOdds(selection.odds)}</span>
                          {betType === "single" && stakes[selection.id] && (
                            <p className="text-xs text-muted-foreground">
                              ${Number.parseFloat(stakes[selection.id]).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Stake</span>
                  <span className="font-semibold">${totalStake.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Potential Win</span>
                  <span className="text-lg font-bold text-primary">${potentialWin.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-500">
                  Odds may change. Your bet will be placed at current odds if they differ.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                  Cancel
                </Button>
                <Button onClick={handleConfirmBet} className="flex-1">
                  Place Bet
                </Button>
              </div>
            </div>
          </>
        )}

        {status === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">Placing Your Bet</p>
            <p className="mt-1 text-sm text-muted-foreground">Please wait...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <p className="mt-4 text-lg font-semibold">Bet Placed Successfully!</p>
            <p className="mt-1 text-sm text-muted-foreground">Bet ID: {betId}</p>

            <div className="mt-6 w-full space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-medium">${totalStake.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="font-semibold text-primary">${potentialWin.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex w-full gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Continue Betting
              </Button>
              <Button asChild className="flex-1">
                <a href="/my-bets">View My Bets</a>
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <p className="mt-4 text-lg font-semibold">Bet Failed</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Unable to place your bet. Please try again or contact support.
            </p>

            <div className="mt-6 flex w-full gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={() => setStatus("confirming")} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
