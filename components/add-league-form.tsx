"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Medal, X, Plus, ChevronDown, ChevronUp } from "lucide-react"

// Sample teams for selection
const SAMPLE_TEAMS = [
  { id: "1", name: "FC Barcelona", abbreviation: "FCB" },
  { id: "2", name: "Real Madrid", abbreviation: "RMA" },
  { id: "3", name: "Manchester United", abbreviation: "MUN" },
  { id: "4", name: "Liverpool FC", abbreviation: "LIV" },
  { id: "5", name: "Bayern Munich", abbreviation: "BAY" },
  { id: "6", name: "PSG", abbreviation: "PSG" },
]

// Sample matches for selection
const SAMPLE_MATCHES = [
  { id: "m1", team1: "FC Barcelona", team2: "Real Madrid", label: "FCB vs RMA" },
  { id: "m2", team1: "Manchester United", team2: "Liverpool FC", label: "MUN vs LIV" },
  { id: "m3", team1: "Bayern Munich", team2: "PSG", label: "BAY vs PSG" },
  { id: "m4", team1: "FC Barcelona", team2: "Liverpool FC", label: "FCB vs LIV" },
  { id: "m5", team1: "Real Madrid", team2: "Bayern Munich", label: "RMA vs BAY" },
  { id: "m6", team1: "Manchester United", team2: "PSG", label: "MUN vs PSG" },
]

interface Round {
  id: string
  matches: string[]
}

interface FormData {
  name: string
  teams: string[]
  rounds: Round[]
  current_round: number
  matches: string[]
}

interface FormErrors {
  name?: string
  teams?: string
  current_round?: string
}

export function AddLeagueForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    teams: [],
    rounds: [],
    current_round: 0,
    matches: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [expandedRound, setExpandedRound] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "League name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (formData.teams.length < 2) {
      newErrors.teams = "Select at least 2 teams"
    }

    if (formData.current_round < 0) {
      newErrors.current_round = "Current round must be 0 or greater"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("League created:", formData)
    setIsSubmitting(false)
    setIsSuccess(true)

    // Reset form after showing success
    setTimeout(() => {
      setFormData({
        name: "",
        teams: [],
        rounds: [],
        current_round: 0,
        matches: [],
      })
      setIsSuccess(false)
    }, 2500)
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // Teams management
  const addTeam = (teamId: string) => {
    if (!formData.teams.includes(teamId)) {
      setFormData((prev) => ({ ...prev, teams: [...prev.teams, teamId] }))
      if (errors.teams) {
        setErrors((prev) => ({ ...prev, teams: undefined }))
      }
    }
  }

  const removeTeam = (teamId: string) => {
    setFormData((prev) => ({
      ...prev,
      teams: prev.teams.filter((id) => id !== teamId),
    }))
  }

  // Matches management
  const addMatch = (matchId: string) => {
    if (!formData.matches.includes(matchId)) {
      setFormData((prev) => ({ ...prev, matches: [...prev.matches, matchId] }))
    }
  }

  const removeMatch = (matchId: string) => {
    setFormData((prev) => ({
      ...prev,
      matches: prev.matches.filter((id) => id !== matchId),
    }))
  }

  // Rounds management
  const addRound = () => {
    const newRound: Round = {
      id: `round-${Date.now()}`,
      matches: [],
    }
    setFormData((prev) => ({ ...prev, rounds: [...prev.rounds, newRound] }))
    setExpandedRound(newRound.id)
  }

  const removeRound = (roundId: string) => {
    setFormData((prev) => ({
      ...prev,
      rounds: prev.rounds.filter((r) => r.id !== roundId),
    }))
  }

  const addMatchToRound = (roundId: string, matchId: string) => {
    setFormData((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId && !round.matches.includes(matchId)
          ? { ...round, matches: [...round.matches, matchId] }
          : round
      ),
    }))
  }

  const removeMatchFromRound = (roundId: string, matchId: string) => {
    setFormData((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.id === roundId
          ? { ...round, matches: round.matches.filter((id) => id !== matchId) }
          : round
      ),
    }))
  }

  const getTeamName = (teamId: string) => {
    const team = SAMPLE_TEAMS.find((t) => t.id === teamId)
    return team ? `${team.name} (${team.abbreviation})` : teamId
  }

  const getMatchLabel = (matchId: string) => {
    const match = SAMPLE_MATCHES.find((m) => m.id === matchId)
    return match ? match.label : matchId
  }

  const getAvailableTeams = () => {
    return SAMPLE_TEAMS.filter((team) => !formData.teams.includes(team.id))
  }

  const getAvailableMatches = () => {
    return SAMPLE_MATCHES.filter((match) => !formData.matches.includes(match.id))
  }

  const getAvailableMatchesForRound = (roundId: string) => {
    const round = formData.rounds.find((r) => r.id === roundId)
    const usedInRound = round?.matches || []
    return SAMPLE_MATCHES.filter((match) => !usedInRound.includes(match.id))
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
              <h3 className="text-lg font-semibold text-foreground">League Created</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.name} with {formData.teams.length} teams
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
            <Medal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add New League</CardTitle>
            <CardDescription>Create a league with teams and rounds</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Basic Info */}
            <Field>
              <FieldLabel htmlFor="league-name">League Name</FieldLabel>
              <Input
                id="league-name"
                type="text"
                placeholder="e.g. Champions League 2024"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            {/* Teams Selection */}
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Teams</p>
              
              <Field>
                <FieldLabel htmlFor="add-team">Add Team</FieldLabel>
                <Select
                  value=""
                  onValueChange={(value) => addTeam(value)}
                  disabled={getAvailableTeams().length === 0}
                >
                  <SelectTrigger id="add-team" className={errors.teams ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a team to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTeams().map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teams && <FieldError>{errors.teams}</FieldError>}
              </Field>

              {formData.teams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.teams.map((teamId) => (
                    <Badge key={teamId} variant="secondary" className="gap-1 pr-1">
                      {getTeamName(teamId)}
                      <button
                        type="button"
                        onClick={() => removeTeam(teamId)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {getTeamName(teamId)}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Rounds Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Rounds</p>
                <Button type="button" variant="outline" size="sm" onClick={addRound}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Round
                </Button>
              </div>

              {formData.rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No rounds added yet</p>
              ) : (
                <div className="space-y-2">
                  {formData.rounds.map((round, index) => (
                    <div key={round.id} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer"
                        onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
                      >
                        <span className="text-sm font-medium">
                          Round {index + 1} ({round.matches.length} matches)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeRound(round.id)
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {expandedRound === round.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedRound === round.id && (
                        <div className="p-3 space-y-3">
                          <Select
                            value=""
                            onValueChange={(value) => addMatchToRound(round.id, value)}
                            disabled={getAvailableMatchesForRound(round.id).length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Add match to round" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableMatchesForRound(round.id).map((match) => (
                                <SelectItem key={match.id} value={match.id}>
                                  {match.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {round.matches.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {round.matches.map((matchId) => (
                                <Badge key={matchId} variant="outline" className="gap-1 pr-1">
                                  {getMatchLabel(matchId)}
                                  <button
                                    type="button"
                                    onClick={() => removeMatchFromRound(round.id, matchId)}
                                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Round */}
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Settings</p>
              
              <Field>
                <FieldLabel htmlFor="current-round">Current Round</FieldLabel>
                <Input
                  id="current-round"
                  type="number"
                  min={0}
                  value={formData.current_round}
                  onChange={(e) => handleInputChange("current_round", parseInt(e.target.value) || 0)}
                  className={errors.current_round ? "border-destructive" : ""}
                />
                {errors.current_round && <FieldError>{errors.current_round}</FieldError>}
              </Field>
            </div>

            {/* Matches Selection */}
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">All Matches</p>
              
              <Field>
                <FieldLabel htmlFor="add-match">Add Match</FieldLabel>
                <Select
                  value=""
                  onValueChange={(value) => addMatch(value)}
                  disabled={getAvailableMatches().length === 0}
                >
                  <SelectTrigger id="add-match">
                    <SelectValue placeholder="Select a match to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMatches().map((match) => (
                      <SelectItem key={match.id} value={match.id}>
                        {match.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {formData.matches.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.matches.map((matchId) => (
                    <Badge key={matchId} variant="secondary" className="gap-1 pr-1">
                      {getMatchLabel(matchId)}
                      <button
                        type="button"
                        onClick={() => removeMatch(matchId)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove match</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Creating League...
                </>
              ) : (
                <>
                  <Medal className="mr-2 h-4 w-4" />
                  Create League
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
