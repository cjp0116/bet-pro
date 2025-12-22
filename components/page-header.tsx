'use client'

import type React from 'react'
import { useState } from 'react'
import { ArrowLeft} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { SportsSidebar } from '@/components/sports-sidebar'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  children: React.ReactNode
}

export function PageLayout({
  title, children
}: PageHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const balance = 1250.0

  return (
    <div className="min-h-screen bg-background">
      <Header
        balance={balance}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex">
        <SportsSidebar selectedSport={null} onSelectSport={() => { }} isOpen={isMobileMenuOpen} />

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}