"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Shield, Plus, X } from "lucide-react"
import { playersApi, teamsApi } from "@/lib/api"
import type { Player } from "@/lib/api"

const STATES = ["active", "inactive", "suspended"]

interface SelectedPlayer {
  id: string
  name: string
  position: string
}

interface FormData {
  name: string
  country: string
  city: string
  abbreviation: string
  logo: string
  state: string
  players: SelectedPlayer[]
}

interface FormErrors {
  name?: string
  country?: string
  city?: string
  abbreviation?: string
  logo?: string
  state?: string
  players?: string
}

export function AddTeamForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    country: "",
    city: "",
    abbreviation: "",
    logo: "",
    state: "active",
    players: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  useEffect(() => {
    playersApi.getAll()
      .then((players) => {
        // Only show unassigned players
        setAvailablePlayers(players.filter((p) => !p.team_id))
      })
      .catch(() => setAvailablePlayers([]))
      .finally(() => setLoadingPlayers(false))
  }, [])

  // Players not yet selected in this form
  const selectablePlayers = availablePlayers.filter(
    (p) => !formData.players.some((sel) => sel.id === p.id)
  )

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Please enter the team name"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "The team name must be at least 2 characters long"
    }

    if (!formData.country.trim()) {
      newErrors.country = "Please enter the country"
    }

    if (!formData.city.trim()) {
      newErrors.city = "Please enter the city"
    }

    if (!formData.abbreviation.trim()) {
      newErrors.abbreviation = "Please enter an abbreviation (e.g. FCB)"
    } else if (formData.abbreviation.length > 5) {
      newErrors.abbreviation = "The abbreviation cannot be longer than 5 characters"
    }

    if (formData.logo && !isValidUrl(formData.logo)) {
      newErrors.logo = "The logo link doesn't look like a valid web address"
    }

    if (!formData.state) {
      newErrors.state = "Please select a status for the team"
    }

    if (formData.players.length < 11) {
      newErrors.players = `You need to select at least 11 players (${formData.players.length} selected so far)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string): boolean => {
    if (!string) return true
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      await teamsApi.create({
        name: formData.name,
        country: formData.country,
        city: formData.city,
        abbreviation: formData.abbreviation,
        logo: formData.logo,
        state: formData.state,
        players: formData.players.map((p) => ({ id: p.id, name: p.name, position: p.position })),
      })
      // Re-fetch players so newly assigned players are excluded from next creation
      playersApi.getAll()
        .then((players) => setAvailablePlayers(players.filter((p) => !p.team_id)))
        .catch(() => {})
      setIsSuccess(true)
      setTimeout(() => {
        setFormData({
          name: "",
          country: "",
          city: "",
          abbreviation: "",
          logo: "",
          state: "active",
          players: [],
        })
        setIsSuccess(false)
      }, 2500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      const friendly = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")
        ? "A team with this name already exists. Please choose a different name."
        : msg.toLowerCase().includes("already assigned")
          ? "One or more selected players is already on another team."
          : "Something went wrong while saving the team. Please try again."
      setErrors((prev) => ({ ...prev, players: friendly }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const addPlayer = () => {
    if (!selectedPlayerId) return
    // Guard: prevent duplicate selection
    if (formData.players.some((p) => p.id === selectedPlayerId)) return

    const player = availablePlayers.find((p) => p.id === selectedPlayerId)
    if (!player) return

    setFormData((prev) => ({
      ...prev,
      players: [
        ...prev.players,
        { id: player.id, name: player.name, position: player.position },
      ],
    }))
    setSelectedPlayerId("")
    setErrors((prev) => ({ ...prev, players: undefined }))
  }

  const removePlayer = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }))
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Team Added Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.name} ({formData.abbreviation}) has been created
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add New Team</CardTitle>
            <CardDescription>Enter the team details below</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Basic Info Section */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Basic Information</p>

              <Field>
                <FieldLabel htmlFor="name">Team Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter team name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    className={errors.country ? "border-destructive" : ""}
                  />
                  {errors.country && <FieldError>{errors.country}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <Input
                    id="city"
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && <FieldError>{errors.city}</FieldError>}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="abbreviation">Abbreviation</FieldLabel>
                  <Input
                    id="abbreviation"
                    type="text"
                    placeholder="e.g. FCB"
                    maxLength={5}
                    value={formData.abbreviation}
                    onChange={(e) => handleInputChange("abbreviation", e.target.value.toUpperCase())}
                    className={errors.abbreviation ? "border-destructive" : ""}
                  />
                  {errors.abbreviation && <FieldError>{errors.abbreviation}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="state">State</FieldLabel>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger id="state" className={errors.state ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state.charAt(0).toUpperCase() + state.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <FieldError>{errors.state}</FieldError>}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="logo">Logo URL (optional)</FieldLabel>
                <Input
                  id="logo"
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo}
                  onChange={(e) => handleInputChange("logo", e.target.value)}
                  className={errors.logo ? "border-destructive" : ""}
                />
                {errors.logo && <FieldError>{errors.logo}</FieldError>}
              </Field>
            </div>

            {/* Players Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Players{" "}
                  <span className={formData.players.length >= 11 ? "text-emerald-600" : "text-muted-foreground"}>
                    ({formData.players.length} — min. 11)
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <Select
                  value={selectedPlayerId}
                  onValueChange={setSelectedPlayerId}
                  disabled={loadingPlayers}
                >
                  <SelectTrigger className={`flex-1 ${errors.players ? "border-destructive" : ""}`}>
                    <SelectValue placeholder={loadingPlayers ? "Loading players..." : "Select player"} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectablePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} ({player.position})
                      </SelectItem>
                    ))}
                    {selectablePlayers.length === 0 && !loadingPlayers && (
                      <SelectItem value="__none__" disabled>
                        No available players
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addPlayer}
                  disabled={!selectedPlayerId}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {errors.players && <FieldError>{errors.players}</FieldError>}

              {formData.players.length > 0 && (
                <div className="space-y-2">
                  {formData.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{player.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="rounded-full p-1 hover:bg-muted-foreground/20"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-4"
              disabled={isSubmitting || formData.players.length < 11}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Creating Team...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Create Team
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
