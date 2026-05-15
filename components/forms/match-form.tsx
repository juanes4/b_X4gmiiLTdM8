"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Trophy } from "lucide-react"
import { teamsApi, matchesApi, leaguesApi } from "@/lib/api"
import { FormHeader, SubmitButton } from "./shared"
import type { Team, League } from "@/lib/api"

interface MatchFormProps {
  onSuccess: (title: string, subtitle: string) => void
}

export function MatchForm({ onSuccess }: MatchFormProps) {
  const [formData, setFormData] = useState({
    team1: "",
    team2: "",
    league_id: "",
    score_team1: "",
    score_team2: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingLeagues, setLoadingLeagues] = useState(true)

  useEffect(() => {
    teamsApi.getAll().then(setTeams).catch(() => {}).finally(() => setLoadingTeams(false))
    leaguesApi.getAll().then(setLeagues).catch(() => {}).finally(() => setLoadingLeagues(false))
  }, [])

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.team1) e.team1 = "Please select the first team"
    if (!formData.team2) e.team2 = "Please select the second team"
    if (formData.team1 && formData.team2 && formData.team1 === formData.team2)
      e.teams = "You cannot select the same team twice — please choose two different teams"
    if (formData.score_team1 !== "") {
      const s = parseInt(formData.score_team1)
      if (isNaN(s) || s < 0) e.score_team1 = "The score must be a whole number (0 or higher)"
    }
    if (formData.score_team2 !== "") {
      const s = parseInt(formData.score_team2)
      if (isNaN(s) || s < 0) e.score_team2 = "The score must be a whole number (0 or higher)"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const created = await matchesApi.create({
        team1_id: formData.team1,
        team2_id: formData.team2,
        league_id: formData.league_id || null,
      })
      if (formData.score_team1 !== "" && formData.score_team2 !== "") {
        await matchesApi.updateResult(created.id, parseInt(formData.score_team1), parseInt(formData.score_team2))
      }
      const t1 = teams.find((t) => String(t.id) === formData.team1)?.name || ""
      const t2 = teams.find((t) => String(t.id) === formData.team2)?.name || ""
      onSuccess("Match Created", `${t1} vs ${t2}`)
      setFormData({ team1: "", team2: "", league_id: "", score_team1: "", score_team2: "" })
    } catch {
      setErrors({ _global: "Something went wrong while saving the match. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    if (errors.teams) setErrors((prev) => ({ ...prev, teams: "" }))
  }

  const activeLeagues = leagues.filter((l) => l.state === "active")

  return (
    <form onSubmit={handleSubmit}>
      <FormHeader icon={<Trophy className="h-6 w-6 text-primary" />} title="Add New Match" description="Create a match between two teams" />

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Teams</p>
          <Field>
            <FieldLabel htmlFor="match-team1">Team 1</FieldLabel>
            <Select value={formData.team1} onValueChange={(v) => handleInputChange("team1", v)}>
              <SelectTrigger id="match-team1" className={errors.team1 || errors.teams ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team"} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.abbreviation})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team1 && <FieldError>{errors.team1}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="match-team2">Team 2</FieldLabel>
            <Select value={formData.team2} onValueChange={(v) => handleInputChange("team2", v)}>
              <SelectTrigger id="match-team2" className={errors.team2 || errors.teams ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team"} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.abbreviation})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team2 && <FieldError>{errors.team2}</FieldError>}
          </Field>
          {errors.teams && <FieldError>{errors.teams}</FieldError>}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <p className="text-sm font-medium text-muted-foreground">Match Details</p>
          <Field>
            <FieldLabel htmlFor="match-league">League (optional)</FieldLabel>
            <Select value={formData.league_id} onValueChange={(v) => handleInputChange("league_id", v)}>
              <SelectTrigger id="match-league">
                <SelectValue placeholder={loadingLeagues ? "Loading leagues..." : "Select a league"} />
              </SelectTrigger>
              <SelectContent>
                {activeLeagues.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="match-score1">Score Team 1 (optional)</FieldLabel>
              <Input id="match-score1" type="number" min={0} placeholder="0" value={formData.score_team1}
                onChange={(e) => handleInputChange("score_team1", e.target.value)}
                className={errors.score_team1 ? "border-destructive" : ""} />
              {errors.score_team1 && <FieldError>{errors.score_team1}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="match-score2">Score Team 2 (optional)</FieldLabel>
              <Input id="match-score2" type="number" min={0} placeholder="0" value={formData.score_team2}
                onChange={(e) => handleInputChange("score_team2", e.target.value)}
                className={errors.score_team2 ? "border-destructive" : ""} />
              {errors.score_team2 && <FieldError>{errors.score_team2}</FieldError>}
            </Field>
          </div>
        </div>

        <SubmitButton isSubmitting={isSubmitting} icon={<Trophy className="mr-2 h-4 w-4" />} label="Create Match" loadingLabel="Creating Match..." />
      </FieldGroup>
    </form>
  )
}
