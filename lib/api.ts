const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  country: string
  city: string
  abbreviation: string
  logo?: string
  state: string
  player_count?: number
}

export interface Player {
  id: string
  name: string
  age: number
  position: string
  number: number
  photo?: string
  team_id: string | null
  team_name?: string
}

export interface Match {
  id: string
  team1_id: string
  team2_id: string
  team1_name: string
  team2_name: string
  team1_abbr: string
  team2_abbr: string
  league_id: string | null
  league_name: string | null
  score_team1: number | null
  score_team2: number | null
  winner_id: string | null
  round: number | null
}

export interface League {
  id: string
  name: string
  state: string
  current_round: number
  start_date: string | null
  end_date: string | null
  teams?: Team[]
}

export interface Standing {
  id: number
  name: string
  abbreviation: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  position: number
}

export interface RoundMatch {
  id: string
  team1_id: string
  team2_id: string
  team1_name: string
  team2_name: string
  team1_abbr: string
  team2_abbr: string
  round: number
  played: number
  score_team1: number | null
  score_team2: number | null
  winner_id: string | null
  halftime_score_team1: number | null
  halftime_score_team2: number | null
  venue: string | null
  referee: string | null
  scheduled_at: string | null
}

export interface Round {
  round: number
  matches: RoundMatch[]
}

export interface LeagueRoundsResponse {
  league: League
  rounds: Round[]
  total_rounds: number
}

// ── Section API Interfaces (ISP + DIP) ─────────────────────────────────────────
// Each section only depends on the operations it actually uses.

export interface ITeamsMutations {
  update: (id: string, data: Partial<Team>) => Promise<Team>
  delete: (id: string) => Promise<{ deleted: number }>
  addPlayer: (teamId: string, playerId: string) => Promise<{ added: number }>
}

export interface IPlayersMutations {
  update: (id: string, data: Partial<Player>) => Promise<Player>
  delete: (id: string) => Promise<{ deleted: number }>
}

export interface MatchResultPayload {
  score_team1: number
  score_team2: number
  halftime_score_team1?: number | null
  halftime_score_team2?: number | null
  venue?: string
  referee?: string
  scheduled_at?: string
}

export interface IMatchesMutations {
  updateResult: (id: string, payload: MatchResultPayload) => Promise<Match>
  delete: (id: string) => Promise<{ deleted: number }>
}

export interface ILeaguesMutations {
  update: (id: string, data: Partial<League> & { teams?: string[] }) => Promise<League>
  delete: (id: string) => Promise<{ deleted: number }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    })
  } catch {
    throw new Error("Could not connect to the server. Please check your connection and try again.")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Teams ──────────────────────────────────────────────────────────────────────

export const teamsApi = {
  getAll: () => apiFetch<Team[]>("/teams"),
  create: (data: Omit<Team, "id"> & { players?: { id: string; name: string; position: string }[] }) =>
    apiFetch<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Team>) =>
    apiFetch<Team>(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/teams/${id}`, { method: "DELETE" }),
  addPlayer: (teamId: string, playerId: string) =>
    apiFetch<{ added: number }>(`/teams/${teamId}/players`, { method: "POST", body: JSON.stringify({ player_id: playerId }) }),
}

// ── Players ────────────────────────────────────────────────────────────────────

export const playersApi = {
  getAll: () => apiFetch<Player[]>("/players"),
  create: (data: Omit<Player, "id" | "team_name" | "photo"> & { photo?: string }) =>
    apiFetch<Player>("/players", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Player>) =>
    apiFetch<Player>(`/players/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/players/${id}`, { method: "DELETE" }),
}

// ── Leagues ────────────────────────────────────────────────────────────────────

export const leaguesApi = {
  getAll: () => apiFetch<League[]>("/leagues"),
  create: (data: { name: string; state?: string; current_round?: number; teams?: string[]; start_date?: string; end_date?: string }) =>
    apiFetch<League>("/leagues", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<League> & { teams?: string[] }) =>
    apiFetch<League>(`/leagues/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/leagues/${id}`, { method: "DELETE" }),
  getStandings: (id: string) => apiFetch<Standing[]>(`/leagues/${id}/standings`),
  getRounds: (id: string) => apiFetch<LeagueRoundsResponse>(`/leagues/${id}/rounds`),
  advanceRound: (id: string) =>
    apiFetch<{ message: string; league: League; completed: boolean }>(
      `/leagues/${id}/advance-round`,
      { method: "POST" }
    ),
}

// ── Matches ────────────────────────────────────────────────────────────────────

export const matchesApi = {
  getAll: () => apiFetch<Match[]>("/matches"),
  create: (data: { team1_id: string; team2_id: string; league_id?: string | null; round?: number | null }) =>
    apiFetch<Match>("/matches", { method: "POST", body: JSON.stringify(data) }),
  updateResult: (id: string, payload: MatchResultPayload) =>
    apiFetch<Match>(`/matches/${id}/result`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateMetadata: (id: string, data: { scheduled_at?: string; venue?: string; referee?: string }) =>
    apiFetch<Match>(`/matches/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/matches/${id}`, { method: "DELETE" }),
}
