"use client"

import { useState } from "react"
import { PageLayout } from "@/components/page-header"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Trophy,
  XCircle,
  Gift,
  Receipt,
  Filter,
  Download,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { transactions, formatDateTime, type Transaction } from "@/lib/user-data"

type FilterType = "all" | "deposits" | "withdrawals" | "bets" | "bonuses"

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Transactions" },
  { value: "deposits", label: "Deposits" },
  { value: "withdrawals", label: "Withdrawals" },
  { value: "bets", label: "Bets" },
  { value: "bonuses", label: "Bonuses" },
]

function getTransactionIcon(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
      return <ArrowDownLeft className="h-4 w-4" />
    case "withdrawal":
      return <ArrowUpRight className="h-4 w-4" />
    case "bet_won":
      return <Trophy className="h-4 w-4" />
    case "bet_lost":
      return <XCircle className="h-4 w-4" />
    case "bet_placed":
      return <Receipt className="h-4 w-4" />
    case "bonus":
      return <Gift className="h-4 w-4" />
    default:
      return <Receipt className="h-4 w-4" />
  }
}

function getTransactionColor(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
    case "bet_won":
    case "bonus":
      return "text-[var(--win)] bg-[var(--win)]/10"
    case "withdrawal":
    case "bet_lost":
    case "bet_placed":
      return "text-[var(--lose)] bg-[var(--lose)]/10"
    default:
      return "text-muted-foreground bg-muted"
  }
}

function getTransactionLabel(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
      return "Deposit"
    case "withdrawal":
      return "Withdrawal"
    case "bet_won":
      return "Bet Won"
    case "bet_lost":
      return "Bet Lost"
    case "bet_placed":
      return "Bet Placed"
    case "bonus":
      return "Bonus"
    default:
      return type
  }
}

export default function TransactionsPage() {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredTransactions = transactions.filter(txn => {
    if (filter === 'all') return true
    if(filter === 'deposits') return txn.type === 'deposit'
    if(filter === 'withdrawals') return txn.type === 'withdrawal'
    if(filter === 'bets') return ['bet_placed', 'bet_won', 'bet_lost'].includes(txn.type)
    if(filter === 'bonuses') return txn.type === 'bonus'
    return true
  })

  const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, acc) => sum + acc.amount, 0)
  const totalWithdrawals = Math.abs(transactions.filter(t => t.type === 'withdrawal').reduce((sum, acc) => sum + acc.amount, 0))
  const totalWinnings = transactions.filter((t) => t.type === "bet_won").reduce((sum, t) => sum + t.amount, 0)

  return (
    <PageLayout title="Transaction History">
      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--win)/10">
              <ArrowDownLeft className="h-5 w-5 text-win" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Deposits</p>
              <p className="text-xl font-bold text-win">${totalDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--lose)/10">
              <ArrowUpRight className="h-5 w-5 text-lose" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Withdrawals</p>
              <p className="text-xl font-bold">${totalWithdrawals.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Winnings</p>
              <p className="text-xl font-bold text-primary">${totalWinnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              {filterOptions.find((f) => f.value === filter)?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(filter === option.value && "bg-secondary")}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Transactions List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {filteredTransactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn("flex h-10 w-10 items-center justify-center rounded-lg", getTransactionColor(txn.type))}
                >
                  {getTransactionIcon(txn.type)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{txn.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", getTransactionColor(txn.type))}>
                      {getTransactionLabel(txn.type)}
                    </span>
                    <span>{formatDateTime(txn.date)}</span>
                    {txn.status === "pending" && (
                      <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-lg font-bold", txn.amount > 0 ? "text-win" : "text-foreground")}>
                  {txn.amount > 0 ? "+" : ""}${Math.abs(txn.amount).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Balance: ${txn.balance.toFixed(2)}</p>
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}