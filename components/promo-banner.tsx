"use client"

import { X } from "lucide-react"
import { useState } from "react"

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-primary/20 via-primary/10 to-accent/20 p-4 md:p-6">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-2 rounded-full p-1 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold md:text-xl">🎉 New User Bonus: Get Up to $500!</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Deposit match on your first deposit. Min $10 deposit required. T&Cs apply.
          </p>
        </div>
        <button className="shrink-0 rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          Claim Now
        </button>
      </div>
    </div>
  )
}
