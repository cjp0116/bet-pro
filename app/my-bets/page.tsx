'use client'

import { useState } from 'react'
import { PageLayout } from '@/components/page-header'
import { Clock, CheckCircle2, XCircle, ChevronDown, CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { userBets, formatDateTime, type UserBet } from '@/lib/user-data'
import { formatOdds } from '@/lib/betting-data'
import { cn } from '@/lib/utils'

type BetFilter = 'all' | 'pending' | 'lost' | 'won'
const filterTabs: { value: BetFilter; label:string}[] = [
  { value: 'all', label: 'All Bets' },
  { value: 'pending', label: 'Pending' },
  { value: 'lost', label: 'Lost' },
  { value: 'won', label: 'Won' },
]

function getBetStatusIcon(status: UserBet['status']) {
  switch (status) {
    case 'pending':
      return <Clock className='h-4 w-4' />
    case 'won':
      return <CheckCircle2 className='h-4 w-4' />
    case 'lost':
      return <XCircle className='h-4 w-4' />
    case 'cashout':
      return <CircleDollarSign className='h-4 w-4' />
    default:
      return <Clock className='h-4 w-4' />
  }
}

function getBetStatusColor(status: UserBet["status"]) {
  switch (status) {
    case "pending":
      return "text-accent bg-accent/10 border-accent/30"
    case "won":
      return "text-[var(--win)] bg-[var(--win)]/10 border-[var(--win)]/30"
    case "lost":
      return "text-[var(--lose)] bg-[var(--lose)]/10 border-[var(--lose)]/30"
    case "cashout":
      return "text-primary bg-primary/10 border-primary/30"
    default:
      return "text-muted-foreground bg-muted border-border"
  }
}

function BetCard({ bet }: { bet: UserBet }) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Bet Header */}
      <button
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-secondary/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border",
              getBetStatusColor(bet.status),
            )}
          >
            {getBetStatusIcon(bet.status) as React.ReactNode}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold capitalize">
                {bet.type === "parlay" ? `${bet.selections.length}-Leg Parlay` : bet.selections[0]?.betType || "Single"}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                  getBetStatusColor(bet.status),
                )}
              >
                {bet.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{formatDateTime(bet.placedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Stake</p>
            <p className="font-semibold">${bet.stake.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {bet.status === "won" ? "Won" : bet.status === "lost" ? "Lost" : "To Win"}
            </p>
            <p
              className={cn(
                "font-bold",
                bet.status === "won" && "text-win",
                bet.status === "lost" && "text-lose",
                bet.status === "pending" && "text-primary",
              )}
            >
              {bet.status === "lost"
                ? `-$${bet.stake.toFixed(2)}`
                : `$${(bet.actualWin || bet.potentialWin).toFixed(2)}`}
            </p>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
          />
        </div>
      </button>

      {/* Bet Details */}
      {isExpanded && (
        <div className="border-t border-border bg-secondary/20">
          <div className="divide-y divide-border/50">
            {bet.selections.map((selection, index) => (
              <div key={selection.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  {bet.type === "parlay" && (
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        selection.status === "won" && "bg-(--win)/20 text-win",
                        selection.status === "lost" && "bg-(--lose)/20 text-lose",
                        selection.status === "pending" && "bg-accent/20 text-accent",
                      )}
                    >
                      {index + 1}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selection.selection}</p>
                    <p className="text-sm text-muted-foreground">{selection.matchup}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-secondary px-1.5 py-0.5 uppercase">{selection.league}</span>
                      <span className="capitalize">{selection.betType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatOdds(selection.odds)}</p>
                  {bet.type === "parlay" && (
                    <p
                      className={cn(
                        "text-xs font-medium capitalize",
                        selection.status === "won" && "text-win",
                        selection.status === "lost" && "text-lose",
                        selection.status === "pending" && "text-accent",
                      )}
                    >
                      {selection.status}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bet Footer */}
          <div className="flex items-center justify-between border-t border-border p-4">
            <div className="text-sm text-muted-foreground">
              {bet.settledAt ? <span>Settled: {formatDateTime(bet.settledAt)}</span> : <span>In progress</span>}
            </div>
            {bet.status === "pending" && (
              <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                <CircleDollarSign className="h-4 w-4" />
                Cash Out
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyBetsPage() {
  const [filter, setFilter] = useState<BetFilter>('all')

  const filteredBets = userBets.filter((bet) => {
    if (filter === 'all') return true
    return bet.status === filter
  })

  const stats = {
    pending: userBets.filter(b => b.status === 'pending').length,
    won: userBets.filter(b => b.status === 'won').length,
    lost: userBets.filter(b => b.status === 'lost').length,
    totalStaked: userBets.reduce((sum, b) => sum + b.stake, 0),
    totalWon: userBets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.actualWin || 0), 0),
  }

  return (
    <PageLayout title="My Bets">
      {/* Stats Bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending Bets</p>
          <p className="text-2xl font-bold text-accent">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Won</p>
          <p className="text-2xl font-bold text-win">{stats.won}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Lost</p>
          <p className="text-2xl font-bold text-lose">{stats.lost}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Winnings</p>
          <p className="text-2xl font-bold text-primary">${stats.totalWon.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab.value)}
            className={cn("shrink-0", filter === tab.value && "bg-primary text-primary-foreground")}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
                {tab.value === "pending" ? stats.pending : tab.value === "won" ? stats.won : stats.lost}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Bets List */}
      <div className="space-y-4">
        {filteredBets.map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}

        {filteredBets.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">No bets found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "pending"
                ? "You don't have any pending bets"
                : filter === "won"
                  ? "No winning bets yet"
                  : "No lost bets"}
            </p>
          </div>
        )}
        </div>
    </PageLayout>
  )
}