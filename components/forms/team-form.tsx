"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Shield, Plus, X } from "lucide-react"
import { teamsApi, playersApi } from "@/lib/api"
import type { Player } from "@/lib/api"
import { FormHeader, SubmitButton } from "./shared"
import { LogoInput } from "@/components/ui/logo-input"

const STATES = ["active", "inactive", "suspended"]
const MIN_PLAYERS = 11

interface PlayerPickItem {
  id: string
  name: string
  position: string
}

interface TeamFormProps {
  onSuccess: (title: string, subtitle: string) => void
}

export function TeamForm({ onSuccess }: TeamFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    city: "",
    abbreviation: "",
    logo: "",
    state: "active",
    players: [] as PlayerPickItem[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  useEffect(() => {
    playersApi.getAll()
      .then((players) => setAvailablePlayers(players.filter((p) => !p.team_id)))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false))
  }, [])

  const isValidLogoValue = (s: string): boolean => {
    if (!s) return true
    if (s.startsWith("/uploads/")) return true
    try { new URL(s); return true } catch { return false }
  }

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Please enter the team name"
    else if (formData.name.trim().length < 2) e.name = "The team name must be at least 2 characters long"
    if (!formData.country.trim()) e.country = "Please enter the country"
    if (!formData.city.trim()) e.city = "Please enter the city"
    if (!formData.abbreviation.trim()) e.abbreviation = "Please enter an abbreviation (e.g. FCB)"
    else if (formData.abbreviation.length > 5) e.abbreviation = "The abbreviation cannot be longer than 5 characters"
    if (formData.logo && !isValidLogoValue(formData.logo)) e.logo = "The logo link doesn't look like a valid web address"
    if (!formData.state) e.state = "Please select a status for the team"
    if (formData.players.length < MIN_PLAYERS) e.players = `You need to select ${MIN_PLAYERS} players (${formData.players.length} selected so far)`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
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
      onSuccess("Team Added Successfully", `${formData.name} (${formData.abbreviation}) has been created`)
      setFormData({ name: "", country: "", city: "", abbreviation: "", logo: "", state: "active", players: [] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const friendly = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")
        ? "A team with this name already exists. Please choose a different name."
        : msg.toLowerCase().includes("already assigned")
          ? "One or more selected players is already on another team."
          : "Something went wrong while saving the team. Please try again."
      setErrors({ _global: friendly })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const addPlayer = () => {
    if (!selectedPlayerId) return
    const p = availablePlayers.find((pl) => String(pl.id) === selectedPlayerId)
    if (p && !formData.players.some((fp) => fp.id === String(p.id))) {
      setFormData((prev) => ({
        ...prev,
        players: [...prev.players, { id: String(p.id), name: p.name, position: p.position }],
      }))
      setSelectedPlayerId("")
    }
  }

  const removePlayer = (id: string) => {
    setFormData((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }))
  }

  const selectablePlayers = availablePlayers.filter(
    (p) => !formData.players.some((fp) => fp.id === String(p.id))
  )

  return (
    <form onSubmit={handleSubmit}>
      <FormHeader icon={<Shield className="h-6 w-6 text-primary" />} title="Add New Team" description="Enter the team details below" />

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Basic Information</p>
          <Field>
            <FieldLabel htmlFor="team-name">Team Name</FieldLabel>
            <Input id="team-name" placeholder="Enter team name" value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={errors.name ? "border-destructive" : ""} />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="team-country">Country</FieldLabel>
              <Input id="team-country" placeholder="Country" value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                className={errors.country ? "border-destructive" : ""} />
              {errors.country && <FieldError>{errors.country}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="team-city">City</FieldLabel>
              <Input id="team-city" placeholder="City" value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={errors.city ? "border-destructive" : ""} />
              {errors.city && <FieldError>{errors.city}</FieldError>}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="team-abbreviation">Abbreviation</FieldLabel>
              <Input id="team-abbreviation" placeholder="e.g. FCB" maxLength={5} value={formData.abbreviation}
                onChange={(e) => handleInputChange("abbreviation", e.target.value.toUpperCase())}
                className={errors.abbreviation ? "border-destructive" : ""} />
              {errors.abbreviation && <FieldError>{errors.abbreviation}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="team-state">State</FieldLabel>
              <Select value={formData.state} onValueChange={(v) => handleInputChange("state", v)}>
                <SelectTrigger id="team-state" className={errors.state ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <FieldError>{errors.state}</FieldError>}
            </Field>
          </div>
          <Field>
            <FieldLabel>Logo (optional)</FieldLabel>
            <LogoInput
              value={formData.logo}
              onChange={(url) => handleInputChange("logo", url)}
              disabled={isSubmitting}
              error={!!errors.logo}
            />
            {errors.logo && <FieldError>{errors.logo}</FieldError>}
          </Field>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <p className="text-sm font-medium text-muted-foreground">
            Players{" "}
            <span className={formData.players.length >= MIN_PLAYERS ? "text-emerald-600" : "text-muted-foreground"}>
              ({formData.players.length} — min. {MIN_PLAYERS})
            </span>
          </p>
          <div className="flex gap-2">
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId} disabled={loadingPlayers}>
              <SelectTrigger className={`flex-1 ${errors.players ? "border-destructive" : ""}`}>
                <SelectValue placeholder={loadingPlayers ? "Loading players..." : "Select player"} />
              </SelectTrigger>
              <SelectContent>
                {selectablePlayers.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.position})</SelectItem>
                ))}
                {selectablePlayers.length === 0 && !loadingPlayers && (
                  <SelectItem value="__none__" disabled>No available players</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={addPlayer} disabled={!selectedPlayerId}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.players && <p className="text-sm text-destructive">{errors.players}</p>}
          {formData.players.length > 0 && (
            <div className="space-y-2">
              {formData.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{player.name}</span>
                    <Badge variant="outline" className="text-xs">{player.position}</Badge>
                  </div>
                  <button type="button" onClick={() => removePlayer(player.id)} className="rounded-full p-1 hover:bg-muted-foreground/20">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <SubmitButton isSubmitting={isSubmitting} icon={<Shield className="mr-2 h-4 w-4" />} label="Create Team" loadingLabel="Creating Team..." />
      </FieldGroup>
    </form>
  )
}
