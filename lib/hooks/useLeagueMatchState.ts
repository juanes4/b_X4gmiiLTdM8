"use client"

// SRP: este hook tiene una única responsabilidad — gestionar el estado de datos
// de la página de partidos de liga (carga, rondas, inputs, guardado, avance).
// No contiene lógica de UI ni de auto-guardado (ver useAutoSave).
// DIP: depende de ILeaguesReader e IMatchesResultWriter (abstracciones),
//      no de leaguesApi/matchesApi (implementaciones concretas).

import { useState, useEffect, useCallback, useRef } from "react"
import type { League, LeagueRoundsResponse, Standing, RoundMatch, MatchResultPayload, ILeaguesReader, IMatchesResultWriter } from "@/lib/api"
import { validateHalftimeScore } from "@/lib/validation/matchValidator"

export type MatchInput = {
  s1: string; s2: string; ht1: string; ht2: string
  venue: string; referee: string; scheduled_at: string
}

export const emptyInput = (): MatchInput => ({
  s1: "", s2: "", ht1: "", ht2: "", venue: "", referee: "", scheduled_at: "",
})

const SCORE_FIELDS = new Set<keyof MatchInput>(["s1", "s2", "ht1", "ht2"])

interface UseLeagueMatchStateReturn {
  leagues: League[]
  selectedId: string
  setSelectedId: (id: string) => void
  data: LeagueRoundsResponse | null
  standings: Standing[]
  loading: boolean
  error: string | null
  advanceError: string | null
  advancing: boolean
  savingId: string | null
  inputs: Record<string, MatchInput>
  inputErrors: Record<string, string>
  expandedRounds: Set<number>
  savedIds: Set<string>
  /** Ref espejo de inputs — legible dentro de closures de setTimeout sin captures stale */
  inputsRef: React.MutableRefObject<Record<string, MatchInput>>
  currentRound: number
  totalRounds: number
  isCompleted: boolean
  canAdvance: boolean
  pendingCount: number
  toggleRound: (round: number) => void
  /** Actualiza un campo de input sin disparo de auto-guardado (el componente lo orquesta) */
  setRawInput: (matchId: string, field: keyof MatchInput, value: string) => void
  handleSaveResult: (match: RoundMatch) => Promise<void>
  handleAdvance: () => Promise<void>
  loadLeague: (id: string) => Promise<void>
}

export function useLeagueMatchState(
  leaguesApi: ILeaguesReader,
  matchesApi: IMatchesResultWriter,
): UseLeagueMatchStateReturn {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [data, setData] = useState<LeagueRoundsResponse | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [inputs, setInputs] = useState<Record<string, MatchInput>>({})
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const inputsRef = useRef(inputs)
  useEffect(() => { inputsRef.current = inputs }, [inputs])

  useEffect(() => {
    leaguesApi.getAll().then(setLeagues).catch(() => {})
  }, [])

  const loadLeague = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    setAdvanceError(null)
    try {
      const [roundsData, standingsData] = await Promise.all([
        leaguesApi.getRounds(id),
        leaguesApi.getStandings(id),
      ])
      setData(roundsData)
      setStandings(standingsData)
      setExpandedRounds(new Set([roundsData.league.current_round]))

      const newInputs: Record<string, MatchInput> = {}
      for (const round of roundsData.rounds) {
        for (const match of round.matches) {
          if (!match.played) {
            newInputs[match.id] = {
              s1: "", s2: "", ht1: "", ht2: "",
              scheduled_at: match.scheduled_at ?? "",
              venue: match.venue ?? "",
              referee: match.referee ?? "",
            }
          }
        }
      }
      setInputs(newInputs)
      setInputErrors({})
    } catch {
      setError("Could not load the league data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadLeague(selectedId)
    else { setData(null); setStandings([]) }
  }, [selectedId, loadLeague])

  const toggleRound = (round: number) =>
    setExpandedRounds((prev) => {
      const next = new Set(prev)
      next.has(round) ? next.delete(round) : next.add(round)
      return next
    })

  const setRawInput = (matchId: string, field: keyof MatchInput, value: string) => {
    if (SCORE_FIELDS.has(field) && value !== "" && (isNaN(Number(value)) || Number(value) < 0)) return
    setInputs((prev) => ({ ...prev, [matchId]: { ...(prev[matchId] ?? emptyInput()), [field]: value } }))
    if (inputErrors[matchId]) setInputErrors((prev) => { const n = { ...prev }; delete n[matchId]; return n })
  }

  const handleSaveResult = async (match: RoundMatch) => {
    const inp = inputs[match.id] ?? emptyInput()
    if (inp.s1 === "" || inp.s2 === "") return

    const s1 = parseInt(inp.s1)
    const s2 = parseInt(inp.s2)

    const htError = validateHalftimeScore(s1, s2, inp.ht1, inp.ht2)
    if (htError) {
      setInputErrors((prev) => ({ ...prev, [match.id]: htError }))
      return
    }

    setSavingId(match.id)
    try {
      const payload: MatchResultPayload = { score_team1: s1, score_team2: s2 }
      if (inp.ht1 !== "" && inp.ht2 !== "") {
        payload.halftime_score_team1 = parseInt(inp.ht1)
        payload.halftime_score_team2 = parseInt(inp.ht2)
      }
      if (inp.venue.trim()) payload.venue = inp.venue.trim()
      if (inp.referee.trim()) payload.referee = inp.referee.trim()
      if (inp.scheduled_at) payload.scheduled_at = inp.scheduled_at
      await matchesApi.updateResult(match.id, payload)
      setSavedIds((prev) => new Set([...prev, match.id]))
      setTimeout(() => setSavedIds((prev) => { const n = new Set(prev); n.delete(match.id); return n }), 3000)
      await loadLeague(selectedId)
    } catch (err) {
      setInputErrors((prev) => ({
        ...prev,
        [match.id]: err instanceof Error ? err.message : "Could not save the result. Please try again.",
      }))
    } finally {
      setSavingId(null)
    }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setAdvanceError(null)
    try {
      await leaguesApi.advanceRound(selectedId)
      await loadLeague(selectedId)
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : "Could not advance to the next round. Please try again.")
    } finally {
      setAdvancing(false)
    }
  }

  const currentRound = data?.league.current_round ?? 0
  const totalRounds = data?.total_rounds ?? 0
  const isCompleted = data?.league.state === "completed"
  const currentRoundMatches = data?.rounds.find((r) => r.round === currentRound)?.matches ?? []
  const allCurrentPlayed = currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.played === 1)
  const canAdvance = allCurrentPlayed && !isCompleted && currentRound <= totalRounds
  const pendingCount = currentRoundMatches.filter((m) => m.played === 0).length

  return {
    leagues, selectedId, setSelectedId, data, standings, loading, error,
    advanceError, advancing, savingId, inputs, inputErrors, expandedRounds,
    savedIds, inputsRef, currentRound, totalRounds, isCompleted, canAdvance,
    pendingCount, toggleRound, setRawInput, handleSaveResult, handleAdvance, loadLeague,
  }
}
