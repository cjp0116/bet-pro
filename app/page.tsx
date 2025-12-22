"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { SportsSidebar } from "@/components/sports-sidebar"
import { GameCard } from "@/components/game-card"
import { BetSlip } from "@/components/bet-slip"
import { PromoBanner } from "@/components/promo-banner"
import { LiveGamesTicker } from "@/components/live-games-ticker"
import { featuredGames, sports, type BetSelection } from "@/lib/betting-data"

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [balance] = useState(1250.0)

  const filteredGames =
    selectedSport && sports.find((s) => s.id === selectedSport)
      ? featuredGames.filter((g) => g.sport === selectedSport)
      : featuredGames

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
                    <h1 className="text-2xl font-bold">{currentSport ? currentSport.name : "Featured Games"}</h1>
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
