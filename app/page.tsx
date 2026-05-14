"use client"

import { useState } from "react"
import { AddRecordPage } from "@/components/add-record-page"
import { ManagementSection } from "@/components/management-section"
import { LeagueMatchesPage } from "@/components/league-matches-page"
import { Button } from "@/components/ui/button"
import { Plus, Trophy } from "lucide-react"

type View = "dashboard" | "add-record" | "league-matches"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("dashboard")

  if (currentView === "add-record") {
    return (
      <main className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <AddRecordPage onBack={() => setCurrentView("dashboard")} />
        </div>
      </main>
    )
  }

  if (currentView === "league-matches") {
    return (
      <main className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <LeagueMatchesPage onBack={() => setCurrentView("dashboard")} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage teams, players, and leagues</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCurrentView("league-matches")} size="lg">
              <Trophy className="mr-2 h-5 w-5" />
              Manage League Matches
            </Button>
            <Button onClick={() => setCurrentView("add-record")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add New Record
            </Button>
          </div>
        </header>

        <section key={`management-${currentView}`}>
          <ManagementSection />
        </section>
      </div>
    </main>
  )
}
