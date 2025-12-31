"use client"

import { cn } from "@/lib/utils"
import { sports } from "@/lib/betting-data"
import { Home, TrendingUp, Clock, Star, Trophy, Zap } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

interface SportsSidebarProps {
  selectedSport: string | null
  onSelectSport?: (sport: string | null) => void
  isOpen: boolean
}

const quickLinks = [
  { id: "home", name: "Home", icon: Home },
  { id: "live", name: "Live Now", icon: Zap },
  { id: "popular", name: "Popular", icon: TrendingUp },
  { id: "upcoming", name: "Starting Soon", icon: Clock },
  { id: "favorites", name: "My Favorites", icon: Star },
  { id: "promos", name: "Promotions", icon: Trophy },
]

export function SportsSidebar({ selectedSport, onSelectSport, isOpen }: SportsSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  const handleSelectSport = (sportId: string | null) => {
    if (isHomePage && onSelectSport) {
      // On home page, use the callback for smooth state update
      onSelectSport(sportId)
    } else {
      // On other pages, navigate to home with sport param
      if (sportId) {
        router.push(`/?sport=${sportId}`)
      } else {
        router.push("/")
      }
    }
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "top-16 pt-4",
      )}
    >
      <nav className="flex h-full flex-col overflow-y-auto pb-4">
        <div className="space-y-1 px-3">
          {quickLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleSelectSport(link.id === "home" ? null : link.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                selectedSport === link.id || (link.id === "home" && selectedSport === null)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <link.icon className={cn("h-4 w-4", link.id === "live" && "text-live")} />
              {link.name}
              {link.id === "live" && (
                <span className="ml-auto flex h-5 items-center rounded bg-(--live)/20 px-1.5 text-[10px] font-semibold text-live">
                  12
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 px-3">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Sports
          </h3>
          <div className="space-y-1">
            {sports.map((sport) => (
              <button
                key={sport.id}
                onClick={() => handleSelectSport(sport.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  selectedSport === sport.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <span className="text-base">{sport.icon}</span>
                {sport.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto px-3 pt-6">
          <div className="rounded-lg bg-sidebar-accent/50 p-4">
            <h4 className="font-semibold">Welcome Bonus</h4>
            <p className="mt-1 text-sm text-sidebar-foreground/70">Get up to $500 on your first deposit!</p>
            <button className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Claim Now
            </button>
          </div>
        </div>
      </nav>
    </aside>
  )
}
