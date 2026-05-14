"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Trophy,
  CheckCircle2,
  Clock,
  ArrowRight,
  Medal,
  Loader2,
  MapPin,
  User,
  CalendarClock,
  Save,
} from "lucide-react"
import { leaguesApi, matchesApi } from "@/lib/api"
import type { League, LeagueRoundsResponse, Standing, RoundMatch, MatchResultPayload } from "@/lib/api"

interface LeagueMatchesPageProps {
  onBack?: () => void
}

type MatchInput = {
  s1: string
  s2: string
  ht1: string
  ht2: string
  venue: string
  referee: string
  scheduled_at: string
}

const emptyInput = (): MatchInput => ({ s1: "", s2: "", ht1: "", ht2: "", venue: "", referee: "", scheduled_at: "" })

export function LeagueMatchesPage({ onBack }: LeagueMatchesPageProps) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [data, setData] = useState<LeagueRoundsResponse | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingMetaId, setSavingMetaId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, MatchInput>>({})
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  useEffect(() => {
    leaguesApi.getAll().then(setLeagues).catch(() => {})
  }, [])

  const loadLeague = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    setAdvanceError(null)
    try {
      const [roundsData, standingsData] = await Promise.all([
        leaguesApi.getRounds(id),
        leaguesApi.getStandings(id),
      ])
      setData(roundsData)
      setStandings(standingsData)
      const cur = roundsData.league.current_round
      setExpandedRounds(new Set([cur]))

      // Pre-populate inputs with existing match metadata
      const newInputs: Record<string, MatchInput> = {}
      for (const round of roundsData.rounds) {
        for (const match of round.matches) {
          if (!match.played) {
            newInputs[match.id] = {
              s1: "", s2: "", ht1: "", ht2: "",
              scheduled_at: match.scheduled_at ?? "",
              venue: match.venue ?? "",
              referee: match.referee ?? "",
            }
          }
        }
      }
      setInputs(newInputs)
      setInputErrors({})
    } catch {
      setError("Failed to load league data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadLeague(selectedId)
    else { setData(null); setStandings([]) }
  }, [selectedId, loadLeague])

  const toggleRound = (r: number) =>
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })

  const setInputField = (matchId: string, field: keyof MatchInput, value: string) => {
    if ((field === "s1" || field === "s2" || field === "ht1" || field === "ht2") &&
        value !== "" && (isNaN(Number(value)) || Number(value) < 0)) return
    setInputs((prev) => ({ ...prev, [matchId]: { ...(prev[matchId] ?? emptyInput()), [field]: value } }))
    // Clear error when user edits
    if (inputErrors[matchId]) setInputErrors((prev) => { const n = { ...prev }; delete n[matchId]; return n })
  }

  const handleSaveResult = async (match: RoundMatch) => {
    const inp = inputs[match.id] ?? emptyInput()
    if (inp.s1 === "" || inp.s2 === "") return

    const s1 = parseInt(inp.s1)
    const s2 = parseInt(inp.s2)

    // HT validation
    if (inp.ht1 !== "" && inp.ht2 !== "") {
      const ht1 = parseInt(inp.ht1)
      const ht2 = parseInt(inp.ht2)
      if (ht1 > s1 || ht2 > s2) {
        setInputErrors((prev) => ({
          ...prev,
          [match.id]: `HT (${ht1}–${ht2}) cannot exceed final score (${s1}–${s2})`,
        }))
        return
      }
    }

    setSavingId(match.id)
    try {
      const payload: MatchResultPayload = { score_team1: s1, score_team2: s2 }
      if (inp.ht1 !== "" && inp.ht2 !== "") {
        payload.halftime_score_team1 = parseInt(inp.ht1)
        payload.halftime_score_team2 = parseInt(inp.ht2)
      }
      if (inp.venue.trim()) payload.venue = inp.venue.trim()
      if (inp.referee.trim()) payload.referee = inp.referee.trim()
      if (inp.scheduled_at) payload.scheduled_at = inp.scheduled_at
      await matchesApi.updateResult(match.id, payload)
      await loadLeague(selectedId)
    } catch (err) {
      setInputErrors((prev) => ({
        ...prev,
        [match.id]: err instanceof Error ? err.message : "Save failed",
      }))
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveMeta = async (match: RoundMatch) => {
    const inp = inputs[match.id] ?? emptyInput()
    setSavingMetaId(match.id)
    try {
      const meta: { scheduled_at?: string; venue?: string; referee?: string } = {}
      if (inp.scheduled_at) meta.scheduled_at = inp.scheduled_at
      if (inp.venue.trim()) meta.venue = inp.venue.trim()
      if (inp.referee.trim()) meta.referee = inp.referee.trim()
      await matchesApi.updateMetadata(match.id, meta)
      await loadLeague(selectedId)
    } catch (err) {
      setInputErrors((prev) => ({
        ...prev,
        [match.id]: err instanceof Error ? err.message : "Save failed",
      }))
    } finally {
      setSavingMetaId(null)
    }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setAdvanceError(null)
    try {
      await leaguesApi.advanceRound(selectedId)
      await loadLeague(selectedId)
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : "Could not advance round")
    } finally {
      setAdvancing(false)
    }
  }

  const currentRound = data?.league.current_round ?? 0
  const totalRounds = data?.total_rounds ?? 0
  const isCompleted = data?.league.state === "completed"

  const currentRoundMatches = data?.rounds.find((r) => r.round === currentRound)?.matches ?? []
  const allCurrentPlayed = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.played === 1)
  const canAdvance = allCurrentPlayed && !isCompleted && currentRound <= totalRounds
  const pendingCount = currentRoundMatches.filter((m) => m.played === 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-foreground">League Match Management</h2>
          <p className="text-muted-foreground text-sm">Enter results and track standings by league</p>
        </div>
      </div>

      {/* League selector */}
      <div className="bg-card rounded-xl border p-6">
        <p className="text-sm font-medium mb-2">Select League</p>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Choose a league…" />
          </SelectTrigger>
          <SelectContent>
            {leagues.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No leagues found</div>
            ) : (
              leagues.map((lg) => (
                <SelectItem key={lg.id} value={String(lg.id)}>
                  {lg.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{error}</div>
      )}

      {data && !loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: rounds */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge variant={isCompleted ? "default" : "secondary"}>
                  {isCompleted ? "Completed" : `Round ${currentRound} / ${totalRounds}`}
                </Badge>
                <span className="text-sm text-muted-foreground">{data.league.name}</span>
              </div>

              {!isCompleted && (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    size="sm"
                    onClick={handleAdvance}
                    disabled={!canAdvance || advancing}
                    className="gap-2"
                  >
                    {advancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {currentRound >= totalRounds ? "Finish League" : `Advance to Round ${currentRound + 1}`}
                  </Button>
                  {advanceError && (
                    <p className="text-xs text-destructive">{advanceError}</p>
                  )}
                  {!canAdvance && !advanceError && pendingCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pendingCount} match(es) pending in round {currentRound}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Rounds accordion */}
            {data.rounds.map(({ round, matches }) => {
              const isCurrentRound = round === currentRound
              const playedCount = matches.filter((m) => m.played === 1).length
              const isExpanded = expandedRounds.has(round)

              return (
                <div
                  key={round}
                  className={`rounded-xl border overflow-hidden ${isCurrentRound ? "border-primary/50 shadow-sm" : ""}`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 transition-colors"
                    onClick={() => toggleRound(round)}
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className={`h-4 w-4 ${isCurrentRound ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium text-sm ${isCurrentRound ? "text-primary" : ""}`}>
                        Round {round}
                        {isCurrentRound && <span className="ml-2 text-xs font-normal text-primary">(current)</span>}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {playedCount}/{matches.length} played
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="divide-y">
                      {matches.map((match) => (
                        <MatchRow
                          key={match.id}
                          match={match}
                          input={inputs[match.id] ?? emptyInput()}
                          isSaving={savingId === match.id}
                          isSavingMeta={savingMetaId === match.id}
                          inputError={inputErrors[match.id]}
                          isCurrentRound={isCurrentRound}
                          onFieldChange={(field, val) => setInputField(match.id, field, val)}
                          onSaveResult={() => handleSaveResult(match)}
                          onSaveMeta={() => handleSaveMeta(match)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {data.rounds.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No rounds generated for this league yet.
              </div>
            )}
          </div>

          {/* Right column: standings */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Standings</CardTitle>
                </div>
                <CardDescription className="text-xs">Based on played matches</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 pl-4">#</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">W</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">D</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">L</TableHead>
                      <TableHead className="text-center hidden md:table-cell">GD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                          No results yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      standings.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="pl-4 text-muted-foreground text-xs">{s.position}</TableCell>
                          <TableCell>
                            <span className="font-medium text-sm">{s.abbreviation}</span>
                            <span className="block text-xs text-muted-foreground truncate max-w-[8rem]">{s.name}</span>
                          </TableCell>
                          <TableCell className="text-center font-bold">{s.points}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell">{s.won}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell">{s.drawn}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell">{s.lost}</TableCell>
                          <TableCell className={`text-center text-xs hidden md:table-cell font-medium ${s.goal_diff > 0 ? "text-emerald-600" : s.goal_diff < 0 ? "text-destructive" : ""}`}>
                            {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatScheduledAt(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

// ── Match row ──────────────────────────────────────────────────────────────────

interface MatchRowProps {
  match: RoundMatch
  input: MatchInput
  isSaving: boolean
  isSavingMeta: boolean
  inputError?: string
  isCurrentRound: boolean
  onFieldChange: (field: keyof MatchInput, val: string) => void
  onSaveResult: () => void
  onSaveMeta: () => void
}

function MatchRow({
  match, input, isSaving, isSavingMeta, inputError,
  isCurrentRound, onFieldChange, onSaveResult, onSaveMeta,
}: MatchRowProps) {
  const played = match.played === 1
  const canSave = input.s1 !== "" && input.s2 !== ""

  const hasStoredDetails =
    match.halftime_score_team1 !== null ||
    match.venue ||
    match.referee ||
    match.scheduled_at

  // Metadata dirty: user changed from stored values
  const metaDirty =
    input.scheduled_at !== (match.scheduled_at ?? "") ||
    input.venue !== (match.venue ?? "") ||
    input.referee !== (match.referee ?? "")

  return (
    <div className="px-4 py-3 bg-card">
      {/* Main row */}
      <div className="flex items-center gap-3">
        <div className="w-5 shrink-0">
          {played ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-right flex-1 truncate">{match.team1_name}</span>

          {played ? (
            <div className="shrink-0 text-center">
              <span className="font-bold text-sm px-2 py-0.5 bg-muted rounded">
                {match.score_team1} – {match.score_team2}
              </span>
            </div>
          ) : (
            <div className="shrink-0 flex items-center gap-1">
              <Input
                type="number" min={0} placeholder="0"
                value={input.s1}
                onChange={(e) => onFieldChange("s1", e.target.value)}
                className="w-14 h-7 text-center text-sm px-1"
                disabled={!isCurrentRound}
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number" min={0} placeholder="0"
                value={input.s2}
                onChange={(e) => onFieldChange("s2", e.target.value)}
                className="w-14 h-7 text-center text-sm px-1"
                disabled={!isCurrentRound}
              />
            </div>
          )}

          <span className="text-sm font-medium text-left flex-1 truncate">{match.team2_name}</span>
        </div>

        {!played && isCurrentRound && (
          <Button
            size="sm" variant="outline"
            className="h-7 px-2 text-xs shrink-0"
            disabled={!canSave || isSaving}
            onClick={onSaveResult}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Result"}
          </Button>
        )}
      </div>

      {/* HT + metadata row — read-only when played */}
      {played && hasStoredDetails && (
        <div className="mt-1.5 pl-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {match.halftime_score_team1 !== null && match.halftime_score_team2 !== null && (
            <span className="font-medium text-foreground/70">
              HT&nbsp;{match.halftime_score_team1}&nbsp;–&nbsp;{match.halftime_score_team2}
            </span>
          )}
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{match.venue}
            </span>
          )}
          {match.referee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />{match.referee}
            </span>
          )}
          {match.scheduled_at && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />{formatScheduledAt(match.scheduled_at)}
            </span>
          )}
        </div>
      )}

      {/* Editable metadata + HT — for all unplayed matches */}
      {!played && (
        <div className="mt-2 pl-8 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Halftime score — only editable in current round */}
            {isCurrentRound && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">HT:</span>
                <Input
                  type="number" min={0} placeholder="0"
                  value={input.ht1}
                  onChange={(e) => onFieldChange("ht1", e.target.value)}
                  className="w-12 h-6 text-center text-xs px-1"
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                  type="number" min={0} placeholder="0"
                  value={input.ht2}
                  onChange={(e) => onFieldChange("ht2", e.target.value)}
                  className="w-12 h-6 text-center text-xs px-1"
                />
              </div>
            )}

            {/* Venue */}
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="Venue"
                value={input.venue}
                onChange={(e) => onFieldChange("venue", e.target.value)}
                className="h-6 text-xs w-28"
              />
            </div>

            {/* Referee */}
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                placeholder="Referee"
                value={input.referee}
                onChange={(e) => onFieldChange("referee", e.target.value)}
                className="h-6 text-xs w-28"
              />
            </div>

            {/* Scheduled date */}
            <div className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                type="datetime-local"
                value={input.scheduled_at}
                onChange={(e) => onFieldChange("scheduled_at", e.target.value)}
                className="h-6 text-xs w-44"
              />
            </div>

            {/* Save details button — available for ALL unplayed matches, shown when dirty */}
            {metaDirty && (
              <Button
                size="sm" variant="ghost"
                className="h-6 px-2 text-xs gap-1 text-primary shrink-0"
                disabled={isSavingMeta}
                onClick={onSaveMeta}
              >
                {isSavingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
            )}
          </div>

          {/* Validation error */}
          {inputError && (
            <p className="text-xs text-destructive">{inputError}</p>
          )}
        </div>
      )}
    </div>
  )
}
