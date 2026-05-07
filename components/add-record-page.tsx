"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Shield, UserPlus, Trophy, Medal, ArrowLeft } from "lucide-react"
import { TeamForm } from "./forms/team-form"
import { PlayerForm } from "./forms/player-form"
import { MatchForm } from "./forms/match-form"
import { LeagueForm } from "./forms/league-form"

type RecordType = "team" | "player" | "match" | "league"

interface AddRecordPageProps {
  onBack?: () => void
}

const NAV_ITEMS: { type: RecordType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "team", label: "Team", icon: <Shield className="h-5 w-5" />, description: "Add a new team to the system" },
  { type: "player", label: "Player", icon: <UserPlus className="h-5 w-5" />, description: "Add a new player to the roster" },
  { type: "match", label: "Match", icon: <Trophy className="h-5 w-5" />, description: "Create a match between teams" },
  { type: "league", label: "League", icon: <Medal className="h-5 w-5" />, description: "Create a league with teams and rounds" },
]

export function AddRecordPage({ onBack }: AddRecordPageProps) {
  const [activeTab, setActiveTab] = useState<RecordType>("team")
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: "", subtitle: "" })

  const showSuccess = (title: string, subtitle: string) => {
    setSuccessMessage({ title, subtitle })
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 2500)
  }

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-full bg-emerald-100 p-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">{successMessage.title}</h3>
            <p className="text-muted-foreground mt-1">{successMessage.subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-foreground">Add New Record</h2>
          <p className="text-muted-foreground text-sm">Create a new entry in the system</p>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-4">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.type}
            variant={activeTab === item.type ? "default" : "ghost"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab(item.type)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          {activeTab === "team" && <TeamForm onSuccess={showSuccess} />}
          {activeTab === "player" && <PlayerForm onSuccess={showSuccess} />}
          {activeTab === "match" && <MatchForm onSuccess={showSuccess} />}
          {activeTab === "league" && <LeagueForm onSuccess={showSuccess} />}
        </div>
      </div>
    </div>
  )
}
