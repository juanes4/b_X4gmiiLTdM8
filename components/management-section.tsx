"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Settings, Shield, UserPlus, Trophy, Medal, Pencil, Trash2, Eye, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { teamsApi, playersApi, matchesApi, leaguesApi } from "@/lib/api"
import type { Team, Player, Match, League } from "@/lib/api"

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
const STATES = ["active", "inactive", "suspended"]

// ── Skeleton rows while loading ────────────────────────────────────────────────
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Error row with retry button ────────────────────────────────────────────────
function ErrorRow({ cols, message, onRetry }: { cols: number; message: string; onRetry: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Empty state row ────────────────────────────────────────────────────────────
function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-muted-foreground py-8">
        {message}
      </TableCell>
    </TableRow>
  )
}

export function ManagementSection() {
  const [activeTab, setActiveTab] = useState("teams")
  const [searchQuery, setSearchQuery] = useState("")

  // ── Data states ──────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [leagues, setLeagues] = useState<League[]>([])

  // ── Loading states ───────────────────────────────────────────────────────────
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [loadingLeagues, setLoadingLeagues] = useState(true)

  // ── Error states ─────────────────────────────────────────────────────────────
  const [errorTeams, setErrorTeams] = useState<string | null>(null)
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null)
  const [errorMatches, setErrorMatches] = useState<string | null>(null)
  const [errorLeagues, setErrorLeagues] = useState<string | null>(null)

  // ── Dialog states ────────────────────────────────────────────────────────────
  const [viewDialog, setViewDialog] = useState<{ open: boolean; type: string; item: Team | Player | Match | League | null }>({
    open: false, type: "", item: null,
  })
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: Team | Player | Match | League | null }>({
    open: false, type: "", item: null,
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({
    open: false, type: "", id: "", name: "",
  })

  // ── Edit form states ─────────────────────────────────────────────────────────
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [editLeague, setEditLeague] = useState<League | null>(null)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Fetch functions ──────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true)
    setErrorTeams(null)
    try {
      setTeams(await teamsApi.getAll())
    } catch (err) {
      setErrorTeams(err instanceof Error ? err.message : "Failed to load teams")
    } finally {
      setLoadingTeams(false)
    }
  }, [])

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true)
    setErrorPlayers(null)
    try {
      setPlayers(await playersApi.getAll())
    } catch (err) {
      setErrorPlayers(err instanceof Error ? err.message : "Failed to load players")
    } finally {
      setLoadingPlayers(false)
    }
  }, [])

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true)
    setErrorMatches(null)
    try {
      setMatches(await matchesApi.getAll())
    } catch (err) {
      setErrorMatches(err instanceof Error ? err.message : "Failed to load matches")
    } finally {
      setLoadingMatches(false)
    }
  }, [])

  const fetchLeagues = useCallback(async () => {
    setLoadingLeagues(true)
    setErrorLeagues(null)
    try {
      setLeagues(await leaguesApi.getAll())
    } catch (err) {
      setErrorLeagues(err instanceof Error ? err.message : "Failed to load leagues")
    } finally {
      setLoadingLeagues(false)
    }
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])
  useEffect(() => { fetchPlayers() }, [fetchPlayers])
  useEffect(() => { fetchMatches() }, [fetchMatches])
  useEffect(() => { fetchLeagues() }, [fetchLeagues])

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMatches = matches.filter((m) =>
    m.team1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.team2_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.league_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredLeagues = leagues.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── View handler ─────────────────────────────────────────────────────────────
  const handleView = (type: string, item: Team | Player | Match | League) => {
    setViewDialog({ open: true, type, item })
  }

  // ── Edit handlers ────────────────────────────────────────────────────────────
  const handleEdit = (type: string, item: Team | Player | Match | League) => {
    setEditErrors({})
    if (type === "teams") setEditTeam({ ...(item as Team) })
    else if (type === "players") setEditPlayer({ ...(item as Player) })
    else if (type === "matches") setEditMatch({ ...(item as Match) })
    else if (type === "leagues") setEditLeague({ ...(item as League) })
    setEditDialog({ open: true, type, item })
  }

  const handleSaveEdit = async () => {
    const errors: Record<string, string> = {}
    setIsSaving(true)
    try {
      if (editDialog.type === "teams" && editTeam) {
        if (!editTeam.name.trim()) errors.name = "Name is required"
        if (!editTeam.country.trim()) errors.country = "Country is required"
        if (!editTeam.city.trim()) errors.city = "City is required"
        if (Object.keys(errors).length > 0) { setEditErrors(errors); return }
        await teamsApi.update(editTeam.id, editTeam)
        await fetchTeams()
        setEditDialog({ open: false, type: "", item: null })

      } else if (editDialog.type === "players" && editPlayer) {
        if (!editPlayer.name.trim()) errors.name = "Name is required"
        if (editPlayer.age < 15 || editPlayer.age > 50) errors.age = "Age must be 15-50"
        if (!editPlayer.position) errors.position = "Position is required"
        if (Object.keys(errors).length > 0) { setEditErrors(errors); return }
        await playersApi.update(editPlayer.id, editPlayer)
        await fetchPlayers()
        setEditDialog({ open: false, type: "", item: null })

      } else if (editDialog.type === "matches" && editMatch) {
        if (editMatch.score_team1 !== null && editMatch.score_team2 !== null) {
          await matchesApi.updateResult(editMatch.id, editMatch.score_team1, editMatch.score_team2)
        }
        await fetchMatches()
        setEditDialog({ open: false, type: "", item: null })

      } else if (editDialog.type === "leagues" && editLeague) {
        if (!editLeague.name.trim()) errors.name = "Name is required"
        if (Object.keys(errors).length > 0) { setEditErrors(errors); return }
        await leaguesApi.update(editLeague.id, editLeague)
        await fetchLeagues()
        setEditDialog({ open: false, type: "", item: null })
      }
    } catch (err) {
      setEditErrors({ _global: err instanceof Error ? err.message : "Save failed" })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const handleDeleteClick = (type: string, id: string, name: string) => {
    setDeleteDialog({ open: true, type, id, name })
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      if (deleteDialog.type === "teams") { await teamsApi.delete(deleteDialog.id); await fetchTeams() }
      else if (deleteDialog.type === "players") { await playersApi.delete(deleteDialog.id); await fetchPlayers() }
      else if (deleteDialog.type === "matches") { await matchesApi.delete(deleteDialog.id); await fetchMatches() }
      else if (deleteDialog.type === "leagues") { await leaguesApi.delete(deleteDialog.id); await fetchLeagues() }
    } finally {
      setIsDeleting(false)
      setDeleteDialog({ open: false, type: "", id: "", name: "" })
    }
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "—"
    const team = teams.find((t) => t.id === teamId)
    return team ? team.name : "Unknown"
  }

  // ── Render ───────────────────────────────────────────────────────────────────
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
        {/* Search */}
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
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Players</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="leagues" className="gap-1.5">
              <Medal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leagues</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Teams Tab ── */}
          <TabsContent value="teams" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Country</TableHead>
                    <TableHead className="hidden sm:table-cell">City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTeams ? (
                    <SkeletonRows cols={5} />
                  ) : errorTeams ? (
                    <ErrorRow cols={5} message={errorTeams} onRetry={fetchTeams} />
                  ) : filteredTeams.length === 0 ? (
                    <EmptyRow cols={5} message={searchQuery ? "No teams match your search" : "No teams found"} />
                  ) : (
                    filteredTeams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          {team.name}
                          <span className="ml-1.5 text-muted-foreground text-xs">({team.abbreviation})</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{team.country}</TableCell>
                        <TableCell className="hidden sm:table-cell">{team.city}</TableCell>
                        <TableCell>
                          <Badge variant={team.state === "active" ? "default" : team.state === "inactive" ? "secondary" : "destructive"}>
                            {team.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView("teams", team)}>
                              <Eye className="h-4 w-4" /><span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit("teams", team)}>
                              <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick("teams", team.id, team.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Players Tab ── */}
          <TabsContent value="players" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Position</TableHead>
                    <TableHead className="hidden md:table-cell">Age</TableHead>
                    <TableHead>#</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPlayers ? (
                    <SkeletonRows cols={5} />
                  ) : errorPlayers ? (
                    <ErrorRow cols={5} message={errorPlayers} onRetry={fetchPlayers} />
                  ) : filteredPlayers.length === 0 ? (
                    <EmptyRow cols={5} message={searchQuery ? "No players match your search" : "No players found"} />
                  ) : (
                    filteredPlayers.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{player.position}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{player.age ?? "—"}</TableCell>
                        <TableCell>{player.number ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView("players", player)}>
                              <Eye className="h-4 w-4" /><span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit("players", player)}>
                              <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick("players", player.id, player.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Matches Tab ── */}
          <TabsContent value="matches" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead className="hidden sm:table-cell">League</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden md:table-cell">Winner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMatches ? (
                    <SkeletonRows cols={5} />
                  ) : errorMatches ? (
                    <ErrorRow cols={5} message={errorMatches} onRetry={fetchMatches} />
                  ) : filteredMatches.length === 0 ? (
                    <EmptyRow cols={5} message={searchQuery ? "No matches match your search" : "No matches found"} />
                  ) : (
                    filteredMatches.map((match) => {
                      const scoreStr =
                        match.score_team1 !== null && match.score_team2 !== null
                          ? `${match.score_team1} - ${match.score_team2}`
                          : "vs"
                      const winner =
                        match.winner_id === match.team1_id ? match.team1_name
                        : match.winner_id === match.team2_id ? match.team2_name
                        : match.score_team1 !== null ? "Draw" : "—"
                      return (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
                            {match.team1_name} vs {match.team2_name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {match.league_name
                              ? <Badge variant="secondary">{match.league_name}</Badge>
                              : <span className="text-muted-foreground text-sm">—</span>
                            }
                          </TableCell>
                          <TableCell>{scoreStr}</TableCell>
                          <TableCell className="hidden md:table-cell">{winner}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleView("matches", match)}>
                                <Eye className="h-4 w-4" /><span className="sr-only">View</span>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit("matches", match)}>
                                <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick("matches", match.id, `${match.team1_name} vs ${match.team2_name}`)}>
                                <Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Leagues Tab ── */}
          <TabsContent value="leagues" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead className="hidden sm:table-cell">Round</TableHead>
                    <TableHead className="hidden md:table-cell">State</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLeagues ? (
                    <SkeletonRows cols={5} />
                  ) : errorLeagues ? (
                    <ErrorRow cols={5} message={errorLeagues} onRetry={fetchLeagues} />
                  ) : filteredLeagues.length === 0 ? (
                    <EmptyRow cols={5} message={searchQuery ? "No leagues match your search" : "No leagues found"} />
                  ) : (
                    filteredLeagues.map((league) => (
                      <TableRow key={league.id}>
                        <TableCell className="font-medium">{league.name}</TableCell>
                        <TableCell>{league.teams?.length ?? 0}</TableCell>
                        <TableCell className="hidden sm:table-cell">{league.current_round}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={league.state === "active" ? "default" : "secondary"}>
                            {league.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView("leagues", league)}>
                              <Eye className="h-4 w-4" /><span className="sr-only">View</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit("leagues", league)}>
                              <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick("leagues", league.id, league.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* ── View Dialog ── */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ ...viewDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {viewDialog.type === "teams" && "Team Details"}
              {viewDialog.type === "players" && "Player Details"}
              {viewDialog.type === "matches" && "Match Details"}
              {viewDialog.type === "leagues" && "League Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {viewDialog.type === "teams" && viewDialog.item && (() => {
              const t = viewDialog.item as Team
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{t.name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Abbreviation</p><p className="font-medium">{t.abbreviation}</p></div>
                  <div><p className="text-sm text-muted-foreground">Country</p><p className="font-medium">{t.country}</p></div>
                  <div><p className="text-sm text-muted-foreground">City</p><p className="font-medium">{t.city}</p></div>
                  <div><p className="text-sm text-muted-foreground">State</p><Badge variant={t.state === "active" ? "default" : "secondary"}>{t.state}</Badge></div>
                </div>
              )
            })()}
            {viewDialog.type === "players" && viewDialog.item && (() => {
              const p = viewDialog.item as Player
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{p.name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Age</p><p className="font-medium">{p.age ?? "—"}</p></div>
                  <div><p className="text-sm text-muted-foreground">Position</p><Badge variant="outline">{p.position}</Badge></div>
                  <div><p className="text-sm text-muted-foreground">Jersey Number</p><p className="font-medium">#{p.number ?? "—"}</p></div>
                  <div><p className="text-sm text-muted-foreground">Team</p><p className="font-medium">{p.team_name || getTeamName(p.team_id)}</p></div>
                </div>
              )
            })()}
            {viewDialog.type === "matches" && viewDialog.item && (() => {
              const m = viewDialog.item as Match
              const winner =
                m.winner_id === m.team1_id ? m.team1_name
                : m.winner_id === m.team2_id ? m.team2_name
                : m.score_team1 !== null ? "Draw" : "—"
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Team 1</p><p className="font-medium">{m.team1_name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Team 2</p><p className="font-medium">{m.team2_name}</p></div>
                  <div><p className="text-sm text-muted-foreground">League</p>{m.league_name ? <Badge variant="secondary">{m.league_name}</Badge> : <span className="text-muted-foreground">—</span>}</div>
                  <div><p className="text-sm text-muted-foreground">Score</p><p className="font-medium">{m.score_team1 !== null && m.score_team2 !== null ? `${m.score_team1} - ${m.score_team2}` : "Not played"}</p></div>
                  <div className="col-span-2"><p className="text-sm text-muted-foreground">Winner</p><p className="font-medium">{winner}</p></div>
                </div>
              )
            })()}
            {viewDialog.type === "leagues" && viewDialog.item && (() => {
              const l = viewDialog.item as League
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{l.name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Teams</p><p className="font-medium">{l.teams?.length ?? 0}</p></div>
                  <div><p className="text-sm text-muted-foreground">Current Round</p><p className="font-medium">{l.current_round}</p></div>
                  <div><p className="text-sm text-muted-foreground">State</p><Badge variant={l.state === "active" ? "default" : "secondary"}>{l.state}</Badge></div>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.type === "teams" && "Edit Team"}
              {editDialog.type === "players" && "Edit Player"}
              {editDialog.type === "matches" && "Edit Match Result"}
              {editDialog.type === "leagues" && "Edit League"}
            </DialogTitle>
            <DialogDescription>Make changes to the record below</DialogDescription>
          </DialogHeader>

          {editErrors._global && (
            <p className="text-sm text-destructive px-1">{editErrors._global}</p>
          )}

          <FieldGroup>
            {editDialog.type === "teams" && editTeam && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-team-name">Team Name</FieldLabel>
                  <Input id="edit-team-name" value={editTeam.name}
                    onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                    className={editErrors.name ? "border-destructive" : ""} />
                  {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-team-country">Country</FieldLabel>
                    <Input id="edit-team-country" value={editTeam.country}
                      onChange={(e) => setEditTeam({ ...editTeam, country: e.target.value })}
                      className={editErrors.country ? "border-destructive" : ""} />
                    {editErrors.country && <FieldError>{editErrors.country}</FieldError>}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-team-city">City</FieldLabel>
                    <Input id="edit-team-city" value={editTeam.city}
                      onChange={(e) => setEditTeam({ ...editTeam, city: e.target.value })}
                      className={editErrors.city ? "border-destructive" : ""} />
                    {editErrors.city && <FieldError>{editErrors.city}</FieldError>}
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-team-abbr">Abbreviation</FieldLabel>
                    <Input id="edit-team-abbr" value={editTeam.abbreviation} maxLength={5}
                      onChange={(e) => setEditTeam({ ...editTeam, abbreviation: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-team-state">State</FieldLabel>
                    <Select value={editTeam.state} onValueChange={(v) => setEditTeam({ ...editTeam, state: v })}>
                      <SelectTrigger id="edit-team-state"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </>
            )}

            {editDialog.type === "players" && editPlayer && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-player-name">Name</FieldLabel>
                  <Input id="edit-player-name" value={editPlayer.name}
                    onChange={(e) => setEditPlayer({ ...editPlayer, name: e.target.value })}
                    className={editErrors.name ? "border-destructive" : ""} />
                  {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-player-age">Age</FieldLabel>
                    <Input id="edit-player-age" type="number" min={15} max={50} value={editPlayer.age}
                      onChange={(e) => setEditPlayer({ ...editPlayer, age: parseInt(e.target.value) || 0 })}
                      className={editErrors.age ? "border-destructive" : ""} />
                    {editErrors.age && <FieldError>{editErrors.age}</FieldError>}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-player-number">Jersey Number</FieldLabel>
                    <Input id="edit-player-number" type="number" min={1} max={99} value={editPlayer.number}
                      onChange={(e) => setEditPlayer({ ...editPlayer, number: parseInt(e.target.value) || 0 })} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="edit-player-position">Position</FieldLabel>
                  <Select value={editPlayer.position} onValueChange={(v) => setEditPlayer({ ...editPlayer, position: v })}>
                    <SelectTrigger id="edit-player-position" className={editErrors.position ? "border-destructive" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editErrors.position && <FieldError>{editErrors.position}</FieldError>}
                </Field>
              </>
            )}

            {editDialog.type === "matches" && editMatch && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground mb-1">Team 1</p><p className="font-medium">{editMatch.team1_name}</p></div>
                  <div><p className="text-sm text-muted-foreground mb-1">Team 2</p><p className="font-medium">{editMatch.team2_name}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-match-score1">Score Team 1</FieldLabel>
                    <Input id="edit-match-score1" type="number" min={0} value={editMatch.score_team1 ?? ""}
                      onChange={(e) => setEditMatch({ ...editMatch, score_team1: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-match-score2">Score Team 2</FieldLabel>
                    <Input id="edit-match-score2" type="number" min={0} value={editMatch.score_team2 ?? ""}
                      onChange={(e) => setEditMatch({ ...editMatch, score_team2: parseInt(e.target.value) || 0 })} />
                  </Field>
                </div>
              </>
            )}

            {editDialog.type === "leagues" && editLeague && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-league-name">League Name</FieldLabel>
                  <Input id="edit-league-name" value={editLeague.name}
                    onChange={(e) => setEditLeague({ ...editLeague, name: e.target.value })}
                    className={editErrors.name ? "border-destructive" : ""} />
                  {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="edit-league-round">Current Round</FieldLabel>
                    <Input id="edit-league-round" type="number" min={0} value={editLeague.current_round}
                      onChange={(e) => setEditLeague({ ...editLeague, current_round: parseInt(e.target.value) || 0 })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="edit-league-state">State</FieldLabel>
                    <Select value={editLeague.state} onValueChange={(v) => setEditLeague({ ...editLeague, state: v })}>
                      <SelectTrigger id="edit-league-state"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: "", item: null })} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{deleteDialog.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
