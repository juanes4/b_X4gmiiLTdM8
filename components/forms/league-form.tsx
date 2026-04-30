"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Medal, X, ChevronDown, ChevronUp, CalendarIcon, Search, Trophy } from "lucide-react"
import { format } from "date-fns"
import { teamsApi, leaguesApi } from "@/lib/api"
import type { Team } from "@/lib/api"
import { FormHeader, SubmitButton } from "./shared"

interface GroupMatch {
  id: string
  team1Id: string
  team2Id: string
}

interface KnockoutRound {
  name: string
  matchCount: number
}

interface LeagueFormProps {
  onSuccess: (title: string, subtitle: string) => void
}

export function LeagueForm({ onSuccess }: LeagueFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    teams: [] as string[],
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teamSearch, setTeamSearch] = useState("")
  const [expandedSection, setExpandedSection] = useState<string | null>("group")
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    teamsApi.getAll().then(setAvailableTeams).catch(() => {}).finally(() => setLoadingTeams(false))
  }, [])

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Please enter the league name"
    else if (formData.name.trim().length < 2) e.name = "The league name must be at least 2 characters long"
    if (formData.teams.length < 2) e.teams = "You need to add at least 2 teams to create a league"
    if (!formData.start_date) e.start_date = "Please select a start date"
    if (!formData.end_date) e.end_date = "Please select an end date"
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date)
      e.end_date = "The end date must be after the start date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const generateGroupMatches = (): GroupMatch[] => {
    const result: GroupMatch[] = []
    const ts = formData.teams
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        result.push({ id: `group-${ts[i]}-${ts[j]}`, team1Id: ts[i], team2Id: ts[j] })
      }
    }
    return result
  }

  const getKnockoutStructure = () => {
    const n = formData.teams.length
    if (n < 2) return { hasKnockout: false, rounds: [] as KnockoutRound[], knockoutTeams: 0 }
    const knockoutTeams = Math.min(8, n)
    const rounds: KnockoutRound[] = []
    if (knockoutTeams >= 8) {
      rounds.push({ name: "Quarter-Finals", matchCount: 4 })
      rounds.push({ name: "Semi-Finals", matchCount: 2 })
      rounds.push({ name: "Final", matchCount: 1 })
    } else if (knockoutTeams >= 4) {
      rounds.push({ name: "Semi-Finals", matchCount: 2 })
      rounds.push({ name: "Final", matchCount: 1 })
    } else if (knockoutTeams >= 2) {
      rounds.push({ name: "Final", matchCount: 1 })
    }
    return { hasKnockout: true, rounds, knockoutTeams }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await leaguesApi.create({
        name: formData.name,
        state: "active",
        current_round: 0,
        teams: formData.teams,
      })
      onSuccess("League Created", `${formData.name} with ${formData.teams.length} teams`)
      setFormData({ name: "", teams: [], start_date: undefined, end_date: undefined })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const friendly = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")
        ? "A league with this name already exists. Please choose a different name."
        : "Something went wrong while saving the league. Please try again."
      setErrors({ _global: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const addTeam = (teamId: string) => {
    if (!formData.teams.includes(teamId)) {
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

  const getSelectableTeams = () => availableTeams.filter((t) =>
    !formData.teams.includes(String(t.id)) &&
    (teamSearch === "" ||
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase()))
  )

  const groupMatches = generateGroupMatches()
  const knockoutStructure = getKnockoutStructure()

  return (
    <form onSubmit={handleSubmit}>
      <FormHeader icon={<Medal className="h-6 w-6 text-primary" />} title="Add New League" description="Create a tournament with group stage and knockout rounds" />

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="league-name">League Name</FieldLabel>
          <Input id="league-name" placeholder="e.g. Champions League 2024" value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""} />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Start Date</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.start_date ? "text-muted-foreground" : ""} ${errors.start_date ? "border-destructive" : ""}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? format(formData.start_date, "PPP") : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={formData.start_date}
                  onSelect={(d) => setFormData((prev) => ({ ...prev, start_date: d }))} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.start_date && <FieldError>{errors.start_date}</FieldError>}
          </Field>
          <Field>
            <FieldLabel>End Date</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.end_date ? "text-muted-foreground" : ""} ${errors.end_date ? "border-destructive" : ""}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.end_date ? format(formData.end_date, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={formData.end_date}
                  onSelect={(d) => setFormData((prev) => ({ ...prev, end_date: d }))}
                  disabled={(d) => formData.start_date ? d <= formData.start_date : false}
                  initialFocus />
              </PopoverContent>
            </Popover>
            {errors.end_date && <FieldError>{errors.end_date}</FieldError>}
          </Field>
        </div>

        <div className="space-y-3 pt-6 border-t">
          <p className="text-sm font-medium text-muted-foreground">Teams</p>
          <Field>
            <FieldLabel htmlFor="league-add-team">Add Team</FieldLabel>
            <Select value="" onValueChange={(v) => { addTeam(v); setTeamSearch("") }}
              disabled={getSelectableTeams().length === 0 && teamSearch === ""}>
              <SelectTrigger id="league-add-team" className={errors.teams ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team to add"} />
              </SelectTrigger>
              <SelectContent>
                <div className="flex items-center border-b px-3 pb-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input placeholder="Search teams..." value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
                </div>
                {getSelectableTeams().length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {teamSearch ? "No teams found" : "No teams available"}
                  </div>
                ) : (
                  getSelectableTeams().map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.abbreviation})</SelectItem>
                  ))
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
                  <button type="button" onClick={() => removeTeam(teamId)} className="ml-1 rounded-full hover:bg-muted p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {formData.teams.length >= 2 && (
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === "group" ? null : "group")}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Group Stage Matches</p>
                <Badge variant="secondary" className="text-xs">{groupMatches.length} matches</Badge>
              </div>
              {expandedSection === "group" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">Every team plays against each other once</p>
            {expandedSection === "group" && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {groupMatches.map((match, index) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground w-8">#{index + 1}</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <span className="text-sm font-medium text-right flex-1">{getTeamLabel(match.team1Id)}</span>
                      <span className="text-xs text-muted-foreground px-2">vs</span>
                      <span className="text-sm font-medium text-left flex-1">{getTeamLabel(match.team2Id)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {knockoutStructure.hasKnockout && formData.teams.length >= 2 && (
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === "knockout" ? null : "knockout")}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Knockout Stage</p>
                <Badge variant="outline" className="text-xs">Top {knockoutStructure.knockoutTeams} advance</Badge>
              </div>
              {expandedSection === "knockout" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">Top teams from group stage advance to knockout rounds</p>
            {expandedSection === "knockout" && (
              <div className="space-y-4">
                {knockoutStructure.rounds.map((round, roundIndex) => (
                  <div key={round.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{round.name}</span>
                      <Badge variant="secondary" className="text-xs">{round.matchCount} {round.matchCount === 1 ? "match" : "matches"}</Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {Array.from({ length: round.matchCount }).map((_, matchIndex) => (
                        <div key={matchIndex} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                          <div className="flex items-center gap-2 flex-1 justify-center">
                            <span className="text-sm text-muted-foreground">
                              {roundIndex === 0 ? `#${matchIndex * 2 + 1} vs #${matchIndex * 2 + 2}` : "Winner vs Winner"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-center gap-2">
                    <Medal className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-primary">League Champion</span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">Winner of the Final match</p>
                </div>
              </div>
            )}
          </div>
        )}

        <SubmitButton isSubmitting={isSubmitting} icon={<Medal className="mr-2 h-4 w-4" />} label="Create League" loadingLabel="Creating League..." />
      </FieldGroup>
    </form>
  )
}
