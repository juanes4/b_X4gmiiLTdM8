"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Medal, X, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react"
import { teamsApi, leaguesApi } from "@/lib/api"
import type { Team } from "@/lib/api"
import { FormHeader, RequiredMark, RequiredNote, SubmitButton } from "./shared"

interface LeagueFormProps {
  onSuccess: (title: string, subtitle: string) => void
}

export function LeagueForm({ onSuccess }: LeagueFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    teams: [] as string[],
    start_date: "",
    end_date: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teamSearch, setTeamSearch] = useState("")
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)

  useEffect(() => {
    teamsApi.getAll().then(setAvailableTeams).catch(() => {}).finally(() => setLoadingTeams(false))
  }, [])

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Please enter the league name"
    else if (formData.name.trim().length < 2) e.name = "League name must be at least 2 characters"
    if (formData.teams.length < 2) e.teams = "You need to add at least 2 teams to create a league"
    if (formData.start_date && formData.end_date && formData.end_date <= formData.start_date)
      e.end_date = "The end date must be after the start date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await leaguesApi.create({
        name: formData.name,
        state: "active",
        teams: formData.teams,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      })
      onSuccess("League Created", `${formData.name} — ${totalRounds} rounds generated`)
      setFormData({ name: "", teams: [], start_date: "", end_date: "" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const friendly =
        msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")
          ? "A league with this name already exists."
          : msg || "Something went wrong while saving the league. Please try again."
      setErrors({ _global: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTeam = (teamId: string) => {
    if (!formData.teams.includes(teamId)) {
      const team = availableTeams.find((t) => String(t.id) === teamId)
      if (team && (team.player_count ?? 0) < 11) {
        setErrors((prev) => ({
          ...prev,
          teams: `'${team.name}' needs at least 11 players to join a league (currently has ${team.player_count ?? 0}). Add players first via Edit Team.`,
        }))
        return
      }
      setFormData((prev) => ({ ...prev, teams: [...prev.teams, teamId] }))
      if (errors.teams) setErrors((prev) => ({ ...prev, teams: "" }))
    }
  }

  const removeTeam = (teamId: string) => {
    setFormData((prev) => ({ ...prev, teams: prev.teams.filter((id) => id !== teamId) }))
  }

  const getTeamLabel = (teamId: string) => {
    const t = availableTeams.find((t) => String(t.id) === teamId)
    return t ? `${t.name} (${t.abbreviation})` : teamId
  }

  const getSelectableTeams = () =>
    availableTeams.filter(
      (t) =>
        !formData.teams.includes(String(t.id)) &&
        (teamSearch === "" ||
          t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
          t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase()))
    )

  // Round-robin schedule preview (rotation algorithm)
  const n = formData.teams.length
  const effectiveN = n % 2 === 0 ? n : n + 1
  const totalRounds = n >= 2 ? effectiveN - 1 : 0
  const matchesPerRound = effectiveN / 2
  const totalMatches = (n * (n - 1)) / 2

  // Compute recommended round dates from start/end
  const roundDates = (() => {
    if (!formData.start_date || !formData.end_date || totalRounds === 0) return [] as string[]
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const totalDays = (end.getTime() - start.getTime()) / 86400000
    if (totalDays <= 0) return [] as string[]
    const step = totalDays / totalRounds
    return Array.from({ length: totalRounds }, (_, i) => {
      const d = new Date(start.getTime() + i * step * 86400000)
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    })
  })()

  // Generate preview matches per round using the rotation algorithm
  const buildPreview = () => {
    if (n < 2) return []
    const teams = [...formData.teams]
    if (teams.length % 2 === 1) teams.push("bye")
    const m = teams.length
    const rotation = [...Array(m).keys()]
    const rounds: { round: number; pairs: [string, string][]; date?: string }[] = []
    for (let r = 1; r < m; r++) {
      const pairs: [string, string][] = []
      for (let i = 0; i < m / 2; i++) {
        const home = teams[rotation[i]]
        const away = teams[rotation[m - 1 - i]]
        if (home !== "bye" && away !== "bye") pairs.push([home, away])
      }
      rounds.push({ round: r, pairs, date: roundDates[r - 1] })
      // rotate: fix index 0, shift rest right
      const last = rotation[m - 1]
      for (let i = m - 1; i > 1; i--) rotation[i] = rotation[i - 1]
      rotation[1] = last
    }
    return rounds
  }

  const previewRounds = buildPreview()

  return (
    <form onSubmit={handleSubmit}>
      <FormHeader
        icon={<Medal className="h-6 w-6 text-primary" />}
        title="Add New League"
        description="Create a round-robin league — the full schedule is generated automatically"
      />
      <RequiredNote />

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="league-name">League Name<RequiredMark /></FieldLabel>
          <Input
            id="league-name"
            placeholder="e.g. Champions League 2025"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }))
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
            }}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        {/* League dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="league-start">Start Date</FieldLabel>
            <Input
              id="league-start"
              type="date"
              value={formData.start_date}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                if (errors.end_date) setErrors((prev) => ({ ...prev, end_date: "" }))
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="league-end">End Date</FieldLabel>
            <Input
              id="league-end"
              type="date"
              value={formData.end_date}
              min={formData.start_date || undefined}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                if (errors.end_date) setErrors((prev) => ({ ...prev, end_date: "" }))
              }}
              className={errors.end_date ? "border-destructive" : ""}
            />
            {errors.end_date && <FieldError>{errors.end_date}</FieldError>}
          </Field>
        </div>

        <div className="space-y-3 pt-6 border-t">
          <p className="text-sm font-medium text-muted-foreground">Teams</p>
          <Field>
            <FieldLabel htmlFor="league-add-team">Teams<RequiredMark /></FieldLabel>
            <Select
              value=""
              onValueChange={(v) => { addTeam(v); setTeamSearch("") }}
              disabled={getSelectableTeams().length === 0 && teamSearch === ""}
            >
              <SelectTrigger id="league-add-team" className={errors.teams ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team to add"} />
              </SelectTrigger>
              <SelectContent>
                <div className="flex items-center border-b px-3 pb-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    placeholder="Search teams..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {getSelectableTeams().length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {teamSearch ? "No teams found" : "No teams available"}
                  </div>
                ) : (
                  getSelectableTeams().map((t) => {
                    const count = t.player_count ?? 0
                    const ineligible = count < 11
                    return (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <span className={ineligible ? "text-amber-600 dark:text-amber-400" : ""}>
                          {t.name} ({t.abbreviation})
                          {ineligible && ` — ⚠ ${count}/11 players`}
                        </span>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
            {errors.teams && <FieldError>{errors.teams}</FieldError>}
          </Field>

          {formData.teams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.teams.map((teamId) => (
                <Badge key={teamId} variant="secondary" className="gap-1 pr-1">
                  {getTeamLabel(teamId)}
                  <button
                    type="button"
                    onClick={() => removeTeam(teamId)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {n >= 2 && (
          <div className="space-y-3 pt-6 border-t">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xl font-bold text-primary">{totalRounds}</p>
                <p className="text-xs text-muted-foreground mt-1">Rounds</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xl font-bold text-primary">{matchesPerRound}</p>
                <p className="text-xs text-muted-foreground mt-1">Matches / round</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xl font-bold text-primary">{totalMatches}</p>
                <p className="text-xs text-muted-foreground mt-1">Total matches</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full flex items-center gap-2 text-muted-foreground"
              onClick={() => setShowSchedule((s) => !s)}
            >
              <Calendar className="h-4 w-4" />
              {showSchedule ? "Hide" : "Preview"} full schedule
              {showSchedule ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </Button>

            {showSchedule && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {previewRounds.map(({ round, pairs, date }) => (
                  <div key={round}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">Round {round}</p>
                      {date && (
                        <span className="text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                          {date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {pairs.map(([a, b], i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-sm">
                          <span className="flex-1 text-right font-medium">{getTeamLabel(a)}</span>
                          <span className="px-3 text-xs text-muted-foreground">vs</span>
                          <span className="flex-1 text-left font-medium">{getTeamLabel(b)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <SubmitButton
          isSubmitting={isSubmitting}
          icon={<Medal className="mr-2 h-4 w-4" />}
          label="Create League"
          loadingLabel="Creating League..."
        />
      </FieldGroup>
    </form>
  )
}
