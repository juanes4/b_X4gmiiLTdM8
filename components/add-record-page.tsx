"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Shield,
  UserPlus,
  Trophy,
  Medal,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  CalendarIcon,
  Search,
  Loader2,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { teamsApi, playersApi, matchesApi, leaguesApi } from "@/lib/api"
import type { Team, Player, League } from "@/lib/api"

// ── Types ──────────────────────────────────────────────────────────────────────
type RecordType = "team" | "player" | "match" | "league"

interface AddRecordPageProps {
  onBack?: () => void
}

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
const STATES = ["active", "inactive", "suspended"]

const NAV_ITEMS: { type: RecordType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "team", label: "Team", icon: <Shield className="h-5 w-5" />, description: "Add a new team to the system" },
  { type: "player", label: "Player", icon: <UserPlus className="h-5 w-5" />, description: "Add a new player to the roster" },
  { type: "match", label: "Match", icon: <Trophy className="h-5 w-5" />, description: "Create a match between teams" },
  { type: "league", label: "League", icon: <Medal className="h-5 w-5" />, description: "Create a league with teams and rounds" },
]

// ── Add Record Page ─────────────────────────────────────────────────────────────
export function AddRecordPage({ onBack }: AddRecordPageProps) {
  const [activeTab, setActiveTab] = useState<RecordType>("team")
  const [isSuccess, setIsSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: "", subtitle: "" })

  const showSuccess = (title: string, subtitle: string) => {
    setSuccessMessage({ title, subtitle })
    setIsSuccess(true)
    setTimeout(() => setIsSuccess(false), 2500)
  }

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-full bg-emerald-100 p-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">{successMessage.title}</h3>
            <p className="text-muted-foreground mt-1">{successMessage.subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

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
          <h2 className="text-xl font-semibold text-foreground">Add New Record</h2>
          <p className="text-muted-foreground text-sm">Create a new entry in the system</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b pb-4">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.type}
            variant={activeTab === item.type ? "default" : "ghost"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab(item.type)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-card rounded-xl border p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          {activeTab === "team" && <TeamForm onSuccess={showSuccess} />}
          {activeTab === "player" && <PlayerForm onSuccess={showSuccess} />}
          {activeTab === "match" && <MatchForm onSuccess={showSuccess} />}
          {activeTab === "league" && <LeagueForm onSuccess={showSuccess} />}
        </div>
      </div>
    </div>
  )
}

// ── Team Form ──────────────────────────────────────────────────────────────────
interface PlayerPickItem {
  id: string
  name: string
  position: string
}

function TeamForm({ onSuccess }: { onSuccess: (title: string, subtitle: string) => void }) {
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

  // Real players from API
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  useEffect(() => {
    playersApi.getAll()
      .then((players) => setAvailablePlayers(players.filter((p) => !p.team_id)))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false))
  }, [])

  const isValidUrl = (s: string): boolean => {
    if (!s) return true
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
    if (formData.logo && !isValidUrl(formData.logo)) e.logo = "The logo link doesn't look like a valid web address"
    if (!formData.state) e.state = "Please select a status for the team"
    if (formData.players.length < 11) e.players = `You need to select at least 11 players (${formData.players.length} selected so far)`
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
    if (selectedPlayerId) {
      const p = availablePlayers.find((pl) => String(pl.id) === selectedPlayerId)
      if (p && !formData.players.some((fp) => fp.id === String(p.id))) {
        setFormData((prev) => ({
          ...prev,
          players: [...prev.players, { id: String(p.id), name: p.name, position: p.position }],
        }))
        setSelectedPlayerId("")
      }
    }
  }

  const removePlayer = (id: string) => {
    setFormData((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/10 p-2"><Shield className="h-6 w-6 text-primary" /></div>
        <div>
          <h3 className="text-lg font-semibold">Add New Team</h3>
          <p className="text-sm text-muted-foreground">Enter the team details below</p>
        </div>
      </div>

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
            <FieldLabel htmlFor="team-logo">Logo URL (optional)</FieldLabel>
            <Input id="team-logo" placeholder="https://example.com/logo.png" value={formData.logo}
              onChange={(e) => handleInputChange("logo", e.target.value)}
              className={errors.logo ? "border-destructive" : ""} />
            {errors.logo && <FieldError>{errors.logo}</FieldError>}
          </Field>
        </div>

        {/* Players Section */}
        <div className="space-y-4 pt-6 border-t">
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
                {availablePlayers
                  .filter((p) => !formData.players.some((fp) => fp.id === String(p.id)))
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.position})
                    </SelectItem>
                  ))}
                {availablePlayers.filter((p) => !formData.players.some((fp) => fp.id === String(p.id))).length === 0 && !loadingPlayers && (
                  <SelectItem value="__none__" disabled>No available players</SelectItem>
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

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating Team...</>
          ) : (
            <><Shield className="mr-2 h-4 w-4" />Create Team</>
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}

// ── Player Form ────────────────────────────────────────────────────────────────
function PlayerForm({ onSuccess }: { onSuccess: (title: string, subtitle: string) => void }) {
  const [formData, setFormData] = useState({ name: "", age: "", position: "", number: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = "Please enter the player's name"
    else if (formData.name.trim().length < 2) e.name = "The player's name must be at least 2 characters long"
    const age = parseInt(formData.age)
    if (!formData.age) e.age = "Please enter the player's age"
    else if (isNaN(age) || age < 15 || age > 50) e.age = "Age must be a number between 15 and 50"
    if (!formData.position) e.position = "Please select the player's position"
    const number = parseInt(formData.number)
    if (!formData.number) e.number = "Please enter the player's jersey number"
    else if (isNaN(number) || number < 1 || number > 99) e.number = "Jersey number must be between 1 and 99"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await playersApi.create({
        name: formData.name,
        age: parseInt(formData.age),
        position: formData.position,
        number: parseInt(formData.number),
        team_id: null,
      })
      onSuccess("Player Added Successfully", `${formData.name} has been added to the roster`)
      setFormData({ name: "", age: "", position: "", number: "" })
    } catch (err) {
      setErrors({ _global: "Something went wrong while saving the player. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/10 p-2"><UserPlus className="h-6 w-6 text-primary" /></div>
        <div>
          <h3 className="text-lg font-semibold">Add New Player</h3>
          <p className="text-sm text-muted-foreground">Enter the player details below</p>
        </div>
      </div>

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="player-name">Name</FieldLabel>
          <Input id="player-name" placeholder="Enter player name" value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""} />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-age">Age</FieldLabel>
          <Input id="player-age" type="number" placeholder="Enter age" min={15} max={50} value={formData.age}
            onChange={(e) => handleInputChange("age", e.target.value)}
            className={errors.age ? "border-destructive" : ""} />
          {errors.age && <FieldError>{errors.age}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-position">Position</FieldLabel>
          <Select value={formData.position} onValueChange={(v) => handleInputChange("position", v)}>
            <SelectTrigger id="player-position" className={errors.position ? "border-destructive" : ""}>
              <SelectValue placeholder="Select a position" />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.position && <FieldError>{errors.position}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="player-number">Jersey Number</FieldLabel>
          <Input id="player-number" type="number" placeholder="Enter jersey number" min={1} max={99} value={formData.number}
            onChange={(e) => handleInputChange("number", e.target.value)}
            className={errors.number ? "border-destructive" : ""} />
          {errors.number && <FieldError>{errors.number}</FieldError>}
        </Field>
        <Button type="submit" className="w-full mt-6" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <><Loader2 className="animate-spin mr-2 h-4 w-4" />Adding Player...</>
          ) : (
            <><UserPlus className="mr-2 h-4 w-4" />Add Player</>
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}

// ── Match Form ─────────────────────────────────────────────────────────────────
function MatchForm({ onSuccess }: { onSuccess: (title: string, subtitle: string) => void }) {
  const [formData, setFormData] = useState({
    team1: "",
    team2: "",
    league_id: "",
    score_team1: "",
    score_team2: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Real data from API
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
    if (formData.team1 && formData.team2 && formData.team1 === formData.team2) e.teams = "You cannot select the same team twice — please choose two different teams"
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
      const matchPayload: { team1_id: string; team2_id: string; league_id?: string | null } = {
        team1_id: formData.team1,
        team2_id: formData.team2,
        league_id: formData.league_id || null,
      }
      const created = await matchesApi.create(matchPayload)

      // If scores provided, update result immediately
      if (formData.score_team1 !== "" && formData.score_team2 !== "") {
        await matchesApi.updateResult(created.id, parseInt(formData.score_team1), parseInt(formData.score_team2))
      }

      const t1 = teams.find((t) => String(t.id) === formData.team1)?.name || ""
      const t2 = teams.find((t) => String(t.id) === formData.team2)?.name || ""
      onSuccess("Match Created", `${t1} vs ${t2}`)
      setFormData({ team1: "", team2: "", league_id: "", score_team1: "", score_team2: "" })
    } catch (err) {
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
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/10 p-2"><Trophy className="h-6 w-6 text-primary" /></div>
        <div>
          <h3 className="text-lg font-semibold">Add New Match</h3>
          <p className="text-sm text-muted-foreground">Create a match between two teams</p>
        </div>
      </div>

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

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating Match...</>
          ) : (
            <><Trophy className="mr-2 h-4 w-4" />Create Match</>
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}

// ── League Form ────────────────────────────────────────────────────────────────
interface GroupMatch {
  id: string
  team1Id: string
  team2Id: string
}

interface KnockoutRound {
  name: string
  matchCount: number
}

function LeagueForm({ onSuccess }: { onSuccess: (title: string, subtitle: string) => void }) {
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

  // Real teams from API
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
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      e.end_date = "The end date must be after the start date"
    }
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
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-primary/10 p-2"><Medal className="h-6 w-6 text-primary" /></div>
        <div>
          <h3 className="text-lg font-semibold">Add New League</h3>
          <p className="text-sm text-muted-foreground">Create a tournament with group stage and knockout rounds</p>
        </div>
      </div>

      {errors._global && <p className="text-sm text-destructive mb-4">{errors._global}</p>}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="league-name">League Name</FieldLabel>
          <Input id="league-name" placeholder="e.g. Champions League 2024" value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""} />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        {/* Date Selection */}
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

        {/* Teams Selection */}
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

        {/* Group Stage Preview */}
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

        {/* Knockout Stage Preview */}
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

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating League...</>
          ) : (
            <><Medal className="mr-2 h-4 w-4" />Create League</>
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}
