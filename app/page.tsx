"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { SportsSidebar } from "@/components/sports-sidebar"
import { GameCard } from "@/components/game-card"
import { BetSlip } from "@/components/bet-slip"
import { PromoBanner } from "@/components/promo-banner"
import { LiveGamesTicker } from "@/components/live-games-ticker"
import { featuredGames as fallbackGames, sports, type BetSelection, type Game } from "@/lib/betting-data"
import { Loader2 } from "lucide-react"
import { useSession, SessionProvider } from "next-auth/react";

// Check if game odds have changed
function hasOddsChanged(oldGame: Game, newGame: Game): boolean {
  const oldOdds = oldGame.odds
  const newOdds = newGame.odds

  return (
    oldOdds.moneyline.home !== newOdds.moneyline.home ||
    oldOdds.moneyline.away !== newOdds.moneyline.away ||
    oldOdds.spread.home !== newOdds.spread.home ||
    oldOdds.spread.away !== newOdds.spread.away ||
    oldOdds.spread.homeOdds !== newOdds.spread.homeOdds ||
    oldOdds.spread.awayOdds !== newOdds.spread.awayOdds ||
    oldOdds.total.line !== newOdds.total.line ||
    oldOdds.total.over !== newOdds.total.over ||
    oldOdds.total.under !== newOdds.total.under ||
    oldGame.homeTeam.score !== newGame.homeTeam.score ||
    oldGame.awayTeam.score !== newGame.awayTeam.score ||
    oldGame.status !== newGame.status
  )
}

// Merge new games with existing, only updating changed games
function mergeGames(existingGames: Game[], newGames: Game[]): Game[] {
  const existingMap = new Map(existingGames.map(g => [g.id, g]))
  const result: Game[] = []

  for (const newGame of newGames) {
    const existing = existingMap.get(newGame.id)

    if (!existing) {
      // New game, add it
      result.push(newGame)
    } else if (hasOddsChanged(existing, newGame)) {
      // Game exists but odds changed, use new data
      result.push(newGame)
    } else {
      // No changes, keep existing reference to prevent re-render
      result.push(existing)
    }
  }

  return result
}

// Freshness metadata from API
interface OddsMeta {
  fromCache: boolean
  isStale: boolean
  ageSeconds: number | null
  timestamp: string
}

function HomeContent() {
  const session = useSession();
  console.log(session.data);
  const searchParams = useSearchParams()
  const router = useRouter()
  const sportFromUrl = searchParams.get("sport")

  const [selectedSport, setSelectedSport] = useState<string | null>(sportFromUrl)
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [balance] = useState(1250.0)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [oddsMeta, setOddsMeta] = useState<OddsMeta | null>(null)
  const isInitialLoad = useRef(true)

  // Sync URL params with state
  useEffect(() => {
    setSelectedSport(sportFromUrl)
  }, [sportFromUrl])

  // Check if selected sport is a valid sport category (not a quick link)
  const isValidSportId = selectedSport && sports.some(s => s.id === selectedSport)

  // Fetch games from API
  const fetchGames = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      // Build URL with sport filter if a sport is selected
      const url = new URL('/api/games/featured', window.location.origin)
      if (isValidSportId) {
        url.searchParams.set('sport', selectedSport!)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }

      const data = await response.json()

      // Store freshness metadata
      if (data.meta) {
        setOddsMeta(data.meta)
      }

      if (data.games && data.games.length > 0) {
        setGames(prev => {
          // On initial load or sport change, replace all games
          if (isInitialLoad.current || showLoading) {
            isInitialLoad.current = false
            return data.games
          }
          // On subsequent polls, only update changed games
          return mergeGames(prev, data.games)
        })
      } else {
        // Use fallback data filtered by sport if no games returned
        const fallback = isValidSportId
          ? fallbackGames.filter(g => g.sport === selectedSport)
          : fallbackGames
        setGames(fallback)
      }
      setError(null)
    } catch (err) {
      console.error('Error fetching games:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Use fallback data on error
      const fallback = isValidSportId
        ? fallbackGames.filter(g => g.sport === selectedSport)
        : fallbackGames
      setGames(fallback)
    } finally {
      setLoading(false)
    }
  }, [selectedSport, isValidSportId])

  // Initial fetch and sport change
  useEffect(() => {
    isInitialLoad.current = true
    fetchGames(true)
  }, [selectedSport])

  // Polling for updates (without loading state)
  useEffect(() => {
    const interval = setInterval(() => fetchGames(false), 10000)
    return () => clearInterval(interval)
  }, [fetchGames])

  // Games are now filtered server-side, no need for client filtering
  const filteredGames = games

  const handleSelectBet = (bet: BetSelection) => {
    setSelectedBets((prev) => {
      const exists = prev.find((b) => b.id === bet.id)
      if (exists) {
        return prev.filter((b) => b.id !== bet.id)
      }
      return [...prev, bet]
    })
  }

  const handleRemoveBet = (id: string) => {
    setSelectedBets((prev) => prev.filter((b) => b.id !== id))
  }

  const handleClearBets = () => {
    setSelectedBets([])
  }

  const currentSport = sports.find((s) => s.id === selectedSport)

  return (

    <div className="min-h-screen bg-background">
      <Header
        balance={balance}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex">
        <SportsSidebar
          selectedSport={selectedSport}
          onSelectSport={(sport) => {
            setSelectedSport(sport)
            setIsMobileMenuOpen(false)
            // Update URL to keep it in sync
            if (sport) {
              router.push(`/?sport=${sport}`, { scroll: false })
            } else {
              router.push("/", { scroll: false })
            }
          }}
          isOpen={isMobileMenuOpen}
        />

        {/* Overlay for mobile menu */}
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
                <PromoBanner />
                <LiveGamesTicker />

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{currentSport ? currentSport.name : "Featured Games"}</h1>
                      {/* Freshness indicator */}
                      {oddsMeta && !loading && (
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${oddsMeta.isStale
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : 'bg-green-500/20 text-green-600'
                            }`}
                          title={`Last updated: ${oddsMeta.ageSeconds !== null ? `${oddsMeta.ageSeconds}s ago` : 'unknown'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${oddsMeta.isStale ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
                          {oddsMeta.isStale ? 'Updating...' : 'Live'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                        All
                      </button>
                      <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
                        Live
                      </button>
                      <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground">
                        Upcoming
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading games...</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredGames.map((game) => (
                          <GameCard key={game.id} game={game} selectedBets={selectedBets} onSelectBet={handleSelectBet} />
                        ))}
                      </div>

                      {filteredGames.length === 0 && (
                        <div className="rounded-xl border border-border bg-card p-12 text-center">
                          <p className="text-lg font-medium text-muted-foreground">No games available for this sport</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bet Slip - Fixed on mobile, sidebar on desktop */}
              <div className="hidden lg:block">
                <div className="sticky top-20">
                  <BetSlip
                    selections={selectedBets}
                    onRemove={handleRemoveBet}
                    onClear={handleClearBets}
                    balance={balance}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bet Slip Toggle */}
      {selectedBets.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 lg:hidden">
          <BetSlip selections={selectedBets} onRemove={handleRemoveBet} onClear={handleClearBets} balance={balance} />
        </div>
      )}
    </div>

  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SessionProvider>
        <HomeContent />
      </SessionProvider>
    </Suspense>
  )
}
