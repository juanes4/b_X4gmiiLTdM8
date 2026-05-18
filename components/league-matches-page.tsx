"use client"

// SRP: este componente tiene una única responsabilidad — renderizar la UI de
// gestión de partidos y orquestar los hooks especializados.
// La lógica de estado/datos vive en useLeagueMatchState.
// La lógica de auto-guardado vive en useAutoSave.

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft, ChevronDown, ChevronUp, Trophy, CheckCircle2, Clock,
  ArrowRight, Medal, Loader2, MapPin, User, CalendarClock, Save, CalendarDays,
} from "lucide-react"
import type { RoundMatch } from "@/lib/api"
import { leaguesApi, matchesApi } from "@/lib/api"
import { useLeagueMatchState, emptyInput } from "@/lib/hooks/useLeagueMatchState"
import type { MatchInput } from "@/lib/hooks/useLeagueMatchState"
import { useAutoSave } from "@/lib/hooks/useAutoSave"

interface LeagueMatchesPageProps {
  onBack?: () => void
}

type MatchStatus = "draft" | "scheduled" | "active" | "played"

function deriveStatus(match: RoundMatch, isCurrentRound: boolean): MatchStatus {
  if (match.played === 1) return "played"
  if (isCurrentRound) return "active"
  const hasMetadata = !!(match.venue || match.referee || match.scheduled_at)
  return hasMetadata ? "scheduled" : "draft"
}

export function LeagueMatchesPage({ onBack }: LeagueMatchesPageProps) {
  const {
    leagues, selectedId, setSelectedId, data, standings, loading, error,
    advanceError, advancing, savingId, inputs, inputErrors, expandedRounds,
    savedIds, inputsRef, currentRound, totalRounds, isCompleted, canAdvance,
    pendingCount, toggleRound, setRawInput, handleSaveResult, handleAdvance,
  } = useLeagueMatchState(leaguesApi, matchesApi)

  const { autoSavingId, autoSavedId, scheduleAutoSave } = useAutoSave(matchesApi)

  // Glue entre los dos hooks: actualiza el input y dispara auto-guardado si es metadata
  const setInputField = (matchId: string, field: keyof MatchInput, value: string) => {
    setRawInput(matchId, field, value)
    if (field === "venue" || field === "referee" || field === "scheduled_at") {
      scheduleAutoSave(matchId, () => inputsRef.current[matchId] ?? emptyInput())
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">League Match Management</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Enter results and track standings by league</p>
        </div>
      </div>

      {/* Selector de liga */}
      <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Select League</p>
        </div>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="sm:max-w-xs h-10">
            <SelectValue placeholder="Choose a league…" />
          </SelectTrigger>
          <SelectContent>
            {leagues.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No leagues found</div>
            ) : (
              leagues.map((lg) => (
                <SelectItem key={lg.id} value={String(lg.id)}>{lg.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading league data…</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive p-4 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
          {/* Columna izquierda: rondas y partidos */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-lg leading-none">{data.league.name}</h3>
              <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs font-semibold shrink-0">
                {isCompleted ? "Completed" : `Round ${currentRound} / ${totalRounds}`}
              </Badge>
            </div>

            <div className="space-y-3">
              {data.rounds.map(({ round, matches }) => {
                const isCurrentRound = round === currentRound
                const isFutureRound = round > currentRound
                const isPastRound = round < currentRound
                const playedCount = matches.filter((m) => m.played === 1).length
                const isFullyPlayed = playedCount === matches.length && matches.length > 0
                const isExpanded = expandedRounds.has(round)
                const hasAnyScheduled = isFutureRound &&
                  matches.some((m) => m.scheduled_at || m.venue || m.referee)

                return (
                  <div
                    key={round}
                    className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                      isCurrentRound
                        ? "border-primary/40 shadow-sm shadow-primary/10"
                        : isPastRound && isFullyPlayed
                        ? "border-emerald-200 dark:border-emerald-900"
                        : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                        isCurrentRound
                          ? "bg-primary/5 hover:bg-primary/10"
                          : isPastRound && isFullyPlayed
                          ? "bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          : "bg-card hover:bg-muted/30"
                      }`}
                      onClick={() => toggleRound(round)}
                    >
                      <div className="flex items-center gap-3">
                        {isPastRound && isFullyPlayed ? (
                          <span className="h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </span>
                        ) : isCurrentRound ? (
                          <span className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                          </span>
                        ) : (
                          <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                        <div className="text-left">
                          <p className={`font-bold text-sm leading-snug ${
                            isCurrentRound ? "text-primary" :
                            isPastRound && isFullyPlayed ? "text-emerald-700 dark:text-emerald-400" :
                            "text-foreground"
                          }`}>
                            Round {round}
                          </p>
                          <p className={`text-xs mt-0.5 ${
                            isCurrentRound ? "text-primary/70" :
                            isPastRound && isFullyPlayed ? "text-emerald-600/80 dark:text-emerald-500/70" :
                            "text-muted-foreground"
                          }`}>
                            {isCurrentRound
                              ? `In Progress · ${playedCount}/${matches.length} played`
                              : isPastRound && isFullyPlayed
                              ? "Completed"
                              : isFutureRound
                              ? hasAnyScheduled
                                ? `Upcoming · ${matches.length} matches scheduled`
                                : `Upcoming · ${matches.length} matches`
                              : `${playedCount}/${matches.length} played`}
                          </p>
                        </div>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="p-4 space-y-3 border-t border-border/40 bg-muted/10">
                        {isFutureRound && (
                          <div className="flex items-start gap-2 px-1 pb-1">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              This round is not yet active. You can schedule matches now — venue, referee, and date will
                              be saved. Score entry opens when the round starts.
                            </p>
                          </div>
                        )}

                        {matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            input={inputs[match.id] ?? emptyInput()}
                            isSaving={savingId === match.id}
                            isAutoSaving={autoSavingId === match.id}
                            autoSaved={autoSavedId === match.id}
                            inputError={inputErrors[match.id]}
                            isCurrentRound={isCurrentRound}
                            isFutureRound={isFutureRound}
                            justSaved={savedIds.has(match.id)}
                            onFieldChange={(field, val) => setInputField(match.id, field, val)}
                            onSaveResult={() => handleSaveResult(match)}
                          />
                        ))}

                        {isCurrentRound && !isCompleted && (
                          <div className="pt-3 mt-1 border-t border-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className={`text-xs ${canAdvance ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                              {canAdvance
                                ? "All matches completed — ready to advance!"
                                : `Complete ${pendingCount} remaining match${pendingCount !== 1 ? "es" : ""} to advance`}
                            </p>
                            <div className="flex flex-col items-start sm:items-end gap-1">
                              <Button
                                size="sm"
                                onClick={handleAdvance}
                                disabled={!canAdvance || advancing}
                                className={`gap-2 shrink-0 transition-all ${
                                  canAdvance ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30" : ""
                                }`}
                              >
                                {advancing
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <ArrowRight className="h-4 w-4" />}
                                {currentRound >= totalRounds ? "Finish League" : `Advance to Round ${currentRound + 1}`}
                              </Button>
                              {advanceError && <p className="text-xs text-destructive">{advanceError}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {data.rounds.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No rounds generated for this league yet.
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: standings */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card className="overflow-hidden border-border/70">
              <CardHeader className="pb-3 bg-gradient-to-b from-muted/40 to-transparent border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">Standings</CardTitle>
                </div>
                <CardDescription className="text-xs">Based on played matches</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-9 pl-3 text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Team</TableHead>
                      <TableHead className="text-center text-xs font-bold text-foreground">Pts</TableHead>
                      <TableHead className="text-center text-xs font-semibold hidden sm:table-cell">W</TableHead>
                      <TableHead className="text-center text-xs font-semibold hidden sm:table-cell">D</TableHead>
                      <TableHead className="text-center text-xs font-semibold hidden sm:table-cell">L</TableHead>
                      <TableHead className="text-center text-xs font-semibold hidden md:table-cell pr-3">GD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                          No results yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      standings.map((s) => (
                        <TableRow
                          key={s.id}
                          className={
                            s.position === 1
                              ? "bg-amber-50/60 dark:bg-amber-950/10"
                              : s.position <= 3
                              ? "bg-slate-50/50 dark:bg-slate-900/10"
                              : ""
                          }
                        >
                          <TableCell className="pl-3 py-2">
                            <span className={`text-xs font-bold h-5 w-5 rounded-full inline-flex items-center justify-center ${
                              s.position === 1 ? "bg-amber-400 text-amber-900"
                              : s.position === 2 ? "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-200"
                              : s.position === 3 ? "bg-amber-700/60 text-amber-100"
                              : "text-muted-foreground"
                            }`}>
                              {s.position}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="font-bold text-xs">{s.abbreviation}</span>
                            <span className="block text-xs text-muted-foreground truncate max-w-[7rem] leading-tight">{s.name}</span>
                          </TableCell>
                          <TableCell className="text-center font-black text-sm py-2">{s.points}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell py-2">{s.won}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell py-2">{s.drawn}</TableCell>
                          <TableCell className="text-center text-xs hidden sm:table-cell py-2">{s.lost}</TableCell>
                          <TableCell className={`text-center text-xs hidden md:table-cell font-semibold pr-3 py-2 ${
                            s.goal_diff > 0 ? "text-emerald-600"
                            : s.goal_diff < 0 ? "text-destructive"
                            : "text-muted-foreground"
                          }`}>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatScheduledAt(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

// ── Match card ────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: RoundMatch
  input: MatchInput
  isSaving: boolean
  isAutoSaving: boolean
  autoSaved: boolean
  inputError?: string
  isCurrentRound: boolean
  isFutureRound: boolean
  justSaved: boolean
  onFieldChange: (field: keyof MatchInput, val: string) => void
  onSaveResult: () => void
}

function MatchCard({
  match, input, isSaving, isAutoSaving, autoSaved, inputError,
  isCurrentRound, isFutureRound, justSaved, onFieldChange, onSaveResult,
}: MatchCardProps) {
  const played = match.played === 1
  const canSave = input.s1 !== "" && input.s2 !== ""
  const status = deriveStatus(match, isCurrentRound)
  const hasPlayedDetails =
    match.halftime_score_team1 !== null || match.venue || match.referee || match.scheduled_at

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      justSaved ? "border-emerald-400 shadow-sm shadow-emerald-200 dark:shadow-emerald-900"
      : played ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10"
      : "border-border bg-card"
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b border-border/30 ${
        played ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-muted/20"
      }`}>
        <StatusBadge status={status} />
        {(match.scheduled_at || (!played && input.scheduled_at)) && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {formatScheduledAt(match.scheduled_at ?? input.scheduled_at)}
          </span>
        )}
      </div>

      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 text-right">
            <p className="font-bold text-sm sm:text-base leading-snug truncate">{match.team1_name}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {played ? (
              <>
                <span className="text-4xl font-black tabular-nums tracking-tight">{match.score_team1}</span>
                <span className="text-xl font-light text-muted-foreground mx-1">–</span>
                <span className="text-4xl font-black tabular-nums tracking-tight">{match.score_team2}</span>
              </>
            ) : (
              <>
                <Input type="number" min={0} placeholder="0" value={input.s1}
                  onChange={(e) => onFieldChange("s1", e.target.value)}
                  className="w-16 h-14 text-center text-2xl font-black px-1 tabular-nums disabled:opacity-35"
                  disabled={!isCurrentRound} />
                <span className="text-xl font-light text-muted-foreground">–</span>
                <Input type="number" min={0} placeholder="0" value={input.s2}
                  onChange={(e) => onFieldChange("s2", e.target.value)}
                  className="w-16 h-14 text-center text-2xl font-black px-1 tabular-nums disabled:opacity-35"
                  disabled={!isCurrentRound} />
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold text-sm sm:text-base leading-snug truncate">{match.team2_name}</p>
          </div>
        </div>
        {isFutureRound && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Score entry opens when this round becomes active
          </p>
        )}
      </div>

      {played && hasPlayedDetails && (
        <div className="px-4 pb-3 pt-0 border-t border-border/20 bg-muted/10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5 text-xs text-muted-foreground">
            {match.halftime_score_team1 !== null && match.halftime_score_team2 !== null && (
              <span className="font-semibold text-foreground/60">
                HT {match.halftime_score_team1}–{match.halftime_score_team2}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{match.venue}</span>
            )}
            {match.referee && (
              <span className="flex items-center gap-1"><User className="h-3 w-3 shrink-0" />{match.referee}</span>
            )}
          </div>
        </div>
      )}

      {!played && (
        <div className="border-t border-border/30 bg-muted/10">
          <div className="px-4 pt-4 pb-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              {isCurrentRound && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Trophy className="h-3 w-3" />Half-Time Score
                  </p>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} placeholder="0" value={input.ht1}
                      onChange={(e) => onFieldChange("ht1", e.target.value)}
                      className="w-16 h-9 text-center text-base font-bold px-1 tabular-nums" />
                    <span className="text-muted-foreground text-sm font-light select-none">–</span>
                    <Input type="number" min={0} placeholder="0" value={input.ht2}
                      onChange={(e) => onFieldChange("ht2", e.target.value)}
                      className="w-16 h-9 text-center text-base font-bold px-1 tabular-nums" />
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />Venue
                </p>
                <Input placeholder="e.g. Camp Nou" value={input.venue}
                  onChange={(e) => onFieldChange("venue", e.target.value)}
                  className="h-9 text-sm w-full" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="h-3 w-3" />Referee
                </p>
                <Input placeholder="e.g. M. Oliver" value={input.referee}
                  onChange={(e) => onFieldChange("referee", e.target.value)}
                  className="h-9 text-sm w-full" />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <CalendarClock className="h-3 w-3" />Date &amp; Time
                </p>
                <Input type="datetime-local" value={input.scheduled_at}
                  onChange={(e) => onFieldChange("scheduled_at", e.target.value)}
                  className="h-9 text-sm w-full sm:max-w-xs" />
              </div>
            </div>

            <div className="flex items-center justify-end h-4">
              {isAutoSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              )}
              {!isAutoSaving && autoSaved && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
            </div>

            {inputError && <p className="text-xs text-destructive">{inputError}</p>}
          </div>

          {isCurrentRound && (
            <div className="px-4 py-3 border-t border-border/20 flex items-center justify-between gap-4 bg-card/50">
              <span className={`text-xs transition-all duration-300 ${justSaved ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
                {justSaved ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Result saved!
                  </span>
                ) : (
                  !canSave ? "Enter both scores to save" : "Ready to save"
                )}
              </span>
              <Button size="sm" onClick={onSaveResult} disabled={!canSave || isSaving} className="gap-2 h-9 px-4 shrink-0">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Result
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
// OCP: agregar un nuevo estado solo requiere añadir una entrada al mapa,
//      sin modificar la función StatusBadge.

const STATUS_CONFIG: Record<MatchStatus, {
  label: string
  className: string
  renderIcon: () => React.ReactNode
}> = {
  played:    { label: "Played",    className: "font-semibold text-emerald-700 dark:text-emerald-400", renderIcon: () => <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> },
  active:    { label: "Active",    className: "font-semibold text-primary",                           renderIcon: () => <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> },
  scheduled: { label: "Scheduled", className: "font-medium text-sky-600 dark:text-sky-400",           renderIcon: () => <CalendarClock className="h-3.5 w-3.5" /> },
  draft:     { label: "Upcoming",  className: "font-medium text-muted-foreground",                    renderIcon: () => <Clock className="h-3.5 w-3.5" /> },
}

function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, className, renderIcon } = STATUS_CONFIG[status]
  return (
    <span className={`flex items-center gap-1.5 text-xs uppercase tracking-wide ${className}`}>
      {renderIcon()}
      {label}
    </span>
  )
}
