"use client"

import { useState } from "react"
import { AddRecordPage } from "@/components/add-record-page"
import { ManagementSection } from "@/components/management-section"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"

type View = "dashboard" | "add-record"

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

  return (
    <main className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage teams, players, matches, and leagues</p>
          </div>
          <Button onClick={() => setCurrentView("add-record")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add New Record
          </Button>
        </header>

        {/* Management Section */}
        <section>
          <ManagementSection />
        </section>
      </div>
    </main>
  )
}
