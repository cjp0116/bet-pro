"use client"

import { featuredGames } from "@/lib/betting-data"
import { Zap } from "lucide-react"

export function LiveGamesTicker() {
  const liveGames = featuredGames.filter((g) => g.status === "live")

  if (liveGames.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-(--live)/30 bg-(--live)/5">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex shrink-0 items-center gap-1.5 text-live">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-semibold">LIVE</span>
        </div>

        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
          {liveGames.map((game) => (
            <div key={game.id} className="flex shrink-0 items-center gap-3 text-sm">
              <span className="font-medium">
                {game.awayTeam.abbr} {game.awayTeam.score}
              </span>
              <span className="text-muted-foreground">@</span>
              <span className="font-medium">
                {game.homeTeam.abbr} {game.homeTeam.score}
              </span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                {game.quarter} {game.clock}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
