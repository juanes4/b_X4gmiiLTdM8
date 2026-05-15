"use client"

import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from "react"
import { Settings, Shield, UserPlus, Trophy, Medal, Search } from "lucide-react"
import { teamsApi, playersApi, matchesApi, leaguesApi } from "@/lib/api"
import { useFetchData } from "@/lib/hooks"
import { TeamsSection } from "./management/teams-section"
import { PlayersSection } from "./management/players-section"
import { MatchesSection } from "./management/matches-section"
import { LeaguesSection } from "./management/leagues-section"

export function ManagementSection() {
  const [activeTab, setActiveTab] = useState("teams")
  const [searchQuery, setSearchQuery] = useState("")

  const { data: teams, loading: loadingTeams, error: errorTeams, refetch: fetchTeams } = useFetchData(teamsApi.getAll, "Could not load teams. Please try again.")
  const { data: players, loading: loadingPlayers, error: errorPlayers, refetch: fetchPlayers } = useFetchData(playersApi.getAll, "Could not load players. Please try again.")
  const { data: matches, loading: loadingMatches, error: errorMatches, refetch: fetchMatches } = useFetchData(matchesApi.getAll, "Could not load matches. Please try again.")
  const { data: leagues, loading: loadingLeagues, error: errorLeagues, refetch: fetchLeagues } = useFetchData(leaguesApi.getAll, "Could not load leagues. Please try again.")

  const refreshTeams = useCallback(() => { fetchTeams(); fetchPlayers() }, [fetchTeams, fetchPlayers])
  const refreshPlayers = useCallback(() => { fetchPlayers(); fetchTeams() }, [fetchPlayers, fetchTeams])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Management</CardTitle>
            <CardDescription>View, edit, and delete existing records</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="teams" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /><span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Players</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" /><span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="leagues" className="gap-1.5">
              <Medal className="h-3.5 w-3.5" /><span className="hidden sm:inline">Leagues</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-4">
            <TeamsSection
              teams={teams}
              players={players}
              loading={loadingTeams}
              error={errorTeams}
              searchQuery={searchQuery}
              onRefresh={refreshTeams}
              api={teamsApi}
            />
          </TabsContent>

          <TabsContent value="players" className="mt-4">
            <PlayersSection
              players={players}
              teams={teams}
              loading={loadingPlayers}
              error={errorPlayers}
              searchQuery={searchQuery}
              onRefresh={refreshPlayers}
              api={playersApi}
            />
          </TabsContent>

          <TabsContent value="matches" className="mt-4">
            <MatchesSection
              matches={matches}
              loading={loadingMatches}
              error={errorMatches}
              searchQuery={searchQuery}
              onRefresh={fetchMatches}
              api={matchesApi}
            />
          </TabsContent>

          <TabsContent value="leagues" className="mt-4">
            <LeaguesSection
              leagues={leagues}
              loading={loadingLeagues}
              error={errorLeagues}
              searchQuery={searchQuery}
              onRefresh={fetchLeagues}
              api={leaguesApi}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
