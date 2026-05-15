"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { CheckCircle2, Trophy } from "lucide-react"
import { teamsApi, matchesApi } from "@/lib/api"
import type { Team } from "@/lib/api"

interface FormData {
  team1: string
  team2: string
  score_team1: string
  score_team2: string
  winner: string
}

interface FormErrors {
  team1?: string
  team2?: string
  teams?: string
  score_team1?: string
  score_team2?: string
  _global?: string
}

export function AddMatchForm() {
  const [formData, setFormData] = useState<FormData>({
    team1: "",
    team2: "",
    score_team1: "",
    score_team2: "",
    winner: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)

  useEffect(() => {
    teamsApi.getAll()
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false))
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.team1) {
      newErrors.team1 = "Please select Team 1"
    }

    if (!formData.team2) {
      newErrors.team2 = "Please select Team 2"
    }

    if (formData.team1 && formData.team2 && formData.team1 === formData.team2) {
      newErrors.teams = "You cannot select the same team twice — please choose two different teams"
    }

    if (formData.score_team1 !== "") {
      const score = parseInt(formData.score_team1)
      if (isNaN(score) || score < 0) {
        newErrors.score_team1 = "The score must be a whole number (0 or higher)"
      }
    }

    if (formData.score_team2 !== "") {
      const score = parseInt(formData.score_team2)
      if (isNaN(score) || score < 0) {
        newErrors.score_team2 = "The score must be a whole number (0 or higher)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      await matchesApi.create({
        team1_id: formData.team1,
        team2_id: formData.team2,
      })
      setIsSuccess(true)
      setTimeout(() => {
        setFormData({
          team1: "",
          team2: "",
          score_team1: "",
          score_team2: "",
          winner: "",
        })
        setIsSuccess(false)
      }, 2500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong while creating the match. Please try again."
      setErrors((prev) => ({ ...prev, _global: msg }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (errors.teams) {
      setErrors((prev) => ({ ...prev, teams: undefined }))
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    return team ? team.name : ""
  }

  const getAvailableWinnerOptions = () => {
    const options = []
    if (formData.team1) {
      const team = teams.find((t) => t.id === formData.team1)
      if (team) options.push(team)
    }
    if (formData.team2) {
      const team = teams.find((t) => t.id === formData.team2)
      if (team) options.push(team)
    }
    return options
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Match Created</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {getTeamName(formData.team1)} vs {getTeamName(formData.team2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add New Match</CardTitle>
            <CardDescription>Create a match between two teams</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {errors._global && (
              <p className="text-sm text-destructive">{errors._global}</p>
            )}

            {/* Teams Section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Teams</p>

              <Field>
                <FieldLabel htmlFor="team1">Team 1</FieldLabel>
                <Select
                  value={formData.team1}
                  onValueChange={(value) => handleSelectChange("team1", value)}
                  disabled={loadingTeams}
                >
                  <SelectTrigger id="team1" className={errors.team1 || errors.teams ? "border-destructive" : ""}>
                    <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team1 && <FieldError>{errors.team1}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="team2">Team 2</FieldLabel>
                <Select
                  value={formData.team2}
                  onValueChange={(value) => handleSelectChange("team2", value)}
                  disabled={loadingTeams}
                >
                  <SelectTrigger id="team2" className={errors.team2 || errors.teams ? "border-destructive" : ""}>
                    <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team2 && <FieldError>{errors.team2}</FieldError>}
              </Field>

              {errors.teams && <FieldError>{errors.teams}</FieldError>}
            </div>

            {/* Match Details Section */}
            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Match Details</p>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="score_team1">Score Team 1 (optional)</FieldLabel>
                  <Input
                    id="score_team1"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={formData.score_team1}
                    onChange={(e) => handleInputChange("score_team1", e.target.value)}
                    className={errors.score_team1 ? "border-destructive" : ""}
                  />
                  {errors.score_team1 && <FieldError>{errors.score_team1}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="score_team2">Score Team 2 (optional)</FieldLabel>
                  <Input
                    id="score_team2"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={formData.score_team2}
                    onChange={(e) => handleInputChange("score_team2", e.target.value)}
                    className={errors.score_team2 ? "border-destructive" : ""}
                  />
                  {errors.score_team2 && <FieldError>{errors.score_team2}</FieldError>}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="winner">Winner (optional)</FieldLabel>
                <Select
                  value={formData.winner}
                  onValueChange={(value) => handleSelectChange("winner", value)}
                  disabled={!formData.team1 && !formData.team2}
                >
                  <SelectTrigger id="winner">
                    <SelectValue placeholder="Select winner or leave for draw" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draw">Draw (No Winner)</SelectItem>
                    {getAvailableWinnerOptions().map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting || loadingTeams}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Creating Match...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Create Match
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
