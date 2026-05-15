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
  teams?: Team[]
}

export interface Standing {
  team_id: string
  team_name: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

// ── Section API Interfaces (ISP + DIP) ─────────────────────────────────────────
// Each section only depends on the operations it actually uses.

export interface ITeamsMutations {
  update: (id: string, data: Partial<Team>) => Promise<Team>
  delete: (id: string) => Promise<{ deleted: number }>
}

export interface IPlayersMutations {
  update: (id: string, data: Partial<Player>) => Promise<Player>
  delete: (id: string) => Promise<{ deleted: number }>
}

export interface IMatchesMutations {
  updateResult: (id: string, score_team1: number, score_team2: number) => Promise<Match>
  delete: (id: string) => Promise<{ deleted: number }>
}

export interface ILeaguesMutations {
  update: (id: string, data: Partial<League> & { teams?: string[] }) => Promise<League>
  delete: (id: string) => Promise<{ deleted: number }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
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
  create: (data: { name: string; state?: string; current_round?: number; teams?: string[] }) =>
    apiFetch<League>("/leagues", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<League> & { teams?: string[] }) =>
    apiFetch<League>(`/leagues/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/leagues/${id}`, { method: "DELETE" }),
  getStandings: (id: string) => apiFetch<Standing[]>(`/leagues/${id}/standings`),
}

// ── Matches ────────────────────────────────────────────────────────────────────

export const matchesApi = {
  getAll: () => apiFetch<Match[]>("/matches"),
  create: (data: { team1_id: string; team2_id: string; league_id?: string | null; round?: number | null }) =>
    apiFetch<Match>("/matches", { method: "POST", body: JSON.stringify(data) }),
  updateResult: (id: string, score_team1: number, score_team2: number) =>
    apiFetch<Match>(`/matches/${id}/result`, {
      method: "PUT",
      body: JSON.stringify({ score_team1, score_team2 }),
    }),
  delete: (id: string) =>
    apiFetch<{ deleted: number }>(`/matches/${id}`, { method: "DELETE" }),
}
