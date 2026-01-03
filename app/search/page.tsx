"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, ArrowLeft, Calendar, Users, Trophy, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/header"
import { SportsSidebar } from "@/components/sports-sidebar"
import { GameCard } from "@/components/game-card"
import { BetSlip } from "@/components/bet-slip"
import { searchAll, type SearchResult } from "@/lib/search-data"
import type { BetSelection } from "@/lib/betting-data"
import { cn } from "@/lib/utils"

const filterTabs = [
  { id: "all", label: "All Results" },
  { id: "game", label: "Games" },
  { id: "team", label: "Teams" },
  { id: "player", label: "Players" },
  { id: "league", label: "Leagues" },
]

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [activeFilter, setActiveFilter] = useState("all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [balance] = useState(1250.0)

  useEffect(() => {
    const searchResults = searchAll(query)
    setResults(searchResults)
  }, [query])

  const filteredResults = activeFilter === "all" ? results : results.filter((r) => r.type === activeFilter)

  const handleSelectBet = (bet: BetSelection) => {
    setSelectedBets((prev) => {
      const exists = prev.find((b) => b.id === bet.id)
      if (exists) {
        return prev.filter((b) => b.id !== bet.id)
      }
      return [...prev, bet]
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "game":
        return <Calendar className="h-5 w-5" />
      case "team":
        return <Users className="h-5 w-5" />
      case "player":
        return <MapPin className="h-5 w-5" />
      case "league":
        return <Trophy className="h-5 w-5" />
    }
  }

  const getResultTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "game":
        return "Game"
      case "team":
        return "Team"
      case "player":
        return "Player"
      case "league":
        return "League"
    }
  }

  const gameResults = filteredResults.filter((r) => r.type === "game" && r.game)
  const otherResults = filteredResults.filter((r) => r.type !== "game" || !r.game)

  return (
    <div className="min-h-screen bg-background">
      <Header
        balance={balance}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex">
        <SportsSidebar selectedSport={null} onSelectSport={() => { }} isOpen={isMobileMenuOpen} />

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                {/* Search Header */}
                <div className="space-y-4">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>

                  <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search games, teams, players, leagues..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-14 pl-12 pr-4 text-lg bg-card border-border"
                      autoFocus
                    />
                  </form>

                  {query && (
                    <p className="text-sm text-muted-foreground">
                      {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
                    </p>
                  )}
                </div>

                {/* Filter Tabs */}
                {results.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {filterTabs.map((tab) => {
                      const count = tab.id === "all" ? results.length : results.filter((r) => r.type === tab.id).length

                      if (count === 0 && tab.id !== "all") return null

                      return (
                        <Button
                          key={tab.id}
                          onClick={() => setActiveFilter(tab.id)}
                          className={cn(
                            "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                            activeFilter === tab.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                          )}
                        >
                          {tab.label}
                          <span
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                              activeFilter === tab.id
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {count}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                )}

                {/* Game Results */}
                {gameResults.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-lg font-semibold">Games</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {gameResults.map((result) => (
                        <GameCard
                          key={result.id}
                          game={result.game!}
                          selectedBets={selectedBets}
                          onSelectBet={handleSelectBet}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Results */}
                {otherResults.length > 0 && (
                  <div>
                    {gameResults.length > 0 && <h2 className="mb-4 text-lg font-semibold">Other Results</h2>}
                    <div className="space-y-2">
                      {otherResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/30"
                        >
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-lg",
                              result.type === "game" && "bg-primary/10 text-primary",
                              result.type === "team" && "bg-blue-500/10 text-blue-500",
                              result.type === "player" && "bg-amber-500/10 text-amber-500",
                              result.type === "league" && "bg-green-500/10 text-green-500",
                            )}
                          >
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                {getResultTypeLabel(result.type)}
                              </span>
                            </div>
                            <p className="font-semibold truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {query && results.length === 0 && (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No results found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Try searching for a different team, player, or league
                    </p>
                  </div>
                )}

                {/* Initial State */}
                {!query && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">Search for anything</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Find games, teams, players, and leagues</p>
                    </div>

                    {/* Popular Searches */}
                    <div>
                      <h2 className="mb-4 text-lg font-semibold">Popular Searches</h2>
                      <div className="flex flex-wrap gap-2">
                        {["NFL", "NBA", "Lakers", "Chiefs", "Patrick Mahomes", "EPL"].map((term) => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bet Slip */}
              <div className="hidden lg:block">
                <div className="sticky top-20">
                  <BetSlip
                    selections={selectedBets}
                    onRemove={(id) => setSelectedBets((prev) => prev.filter((b) => b.id !== id))}
                    onClear={() => setSelectedBets([])}
                    balance={balance}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bet Slip */}
      {selectedBets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 lg:hidden">
          <BetSlip
            selections={selectedBets}
            onRemove={(id) => setSelectedBets((prev) => prev.filter((b) => b.id !== id))}
            onClear={() => setSelectedBets([])}
            balance={balance}
          />
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
