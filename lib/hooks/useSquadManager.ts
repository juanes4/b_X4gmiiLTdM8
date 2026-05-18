"use client"

// SRP: este hook tiene una única responsabilidad — gestionar el estado de la
// plantilla (squad) al editar un equipo: jugadores staged, búsqueda, detección
// de cambios no guardados y restauración tras fallo parcial.
// No contiene lógica de API ni de formulario base del equipo.

import { useState } from "react"
import type { Team, Player } from "@/lib/api"

interface SquadInfo {
  currentSquad: Player[]
  unassignedPlayers: Player[]
  filteredUnassigned: Player[]
}

interface UseSquadManagerReturn {
  originalTeam: Team | null
  stagedPlayers: Player[]
  stagedPlayerIds: Set<string>
  playerSearch: string
  showUnsavedWarning: boolean
  setPlayerSearch: (s: string) => void
  setShowUnsavedWarning: (v: boolean) => void
  /** Llama al abrir el diálogo de edición — captura el estado original */
  openEdit: (team: Team) => void
  /** Limpia todo el estado de plantilla — llama al cerrar o tras guardar exitoso */
  resetSquad: () => void
  /** Agrega un jugador a la lista staged (pendiente de guardar) */
  handleAddPlayer: (playerId: string) => void
  /** Detecta si hay cambios sin guardar comparando con el snapshot original */
  hasUnsavedChanges: (editTeam: Team | null) => boolean
  /** Tras un guardado parcial, deja en staged solo los jugadores que fallaron */
  setStagedAfterFailure: (failedPlayers: Player[]) => void
  /** Calcula listas derivadas para el diálogo de edición */
  getSquadInfo: (editTeam: Team | null) => SquadInfo
}

/**
 * @param allPlayers Lista completa de jugadores — usada para buscar y filtrar.
 *   Pasa el mismo array que recibe el componente como prop; el hook no lo fetches.
 */
export function useSquadManager(allPlayers: Player[]): UseSquadManagerReturn {
  const [originalTeam, setOriginalTeam] = useState<Team | null>(null)
  const [stagedPlayers, setStagedPlayers] = useState<Player[]>([])
  const [stagedPlayerIds, setStagedPlayerIds] = useState<Set<string>>(new Set())
  const [playerSearch, setPlayerSearch] = useState("")
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const openEdit = (team: Team) => {
    setOriginalTeam({ ...team })
    setStagedPlayers([])
    setStagedPlayerIds(new Set())
    setPlayerSearch("")
  }

  const resetSquad = () => {
    setOriginalTeam(null)
    setStagedPlayers([])
    setStagedPlayerIds(new Set())
    setPlayerSearch("")
    setShowUnsavedWarning(false)
  }

  const handleAddPlayer = (playerId: string) => {
    if (!playerId || stagedPlayerIds.has(playerId)) return
    const player = allPlayers.find((p) => String(p.id) === playerId)
    if (!player) return
    setStagedPlayers((prev) => [...prev, player])
    setStagedPlayerIds((prev) => new Set([...prev, playerId]))
    setPlayerSearch("")
  }

  const hasUnsavedChanges = (editTeam: Team | null): boolean => {
    if (!editTeam || !originalTeam) return false
    if (stagedPlayers.length > 0) return true
    return (
      editTeam.name !== originalTeam.name ||
      editTeam.country !== originalTeam.country ||
      editTeam.city !== originalTeam.city ||
      editTeam.abbreviation !== originalTeam.abbreviation ||
      editTeam.state !== originalTeam.state ||
      (editTeam.logo ?? "") !== (originalTeam.logo ?? "")
    )
  }

  const setStagedAfterFailure = (failedPlayers: Player[]) => {
    setStagedPlayers(failedPlayers)
    setStagedPlayerIds(new Set(failedPlayers.map((p) => String(p.id))))
  }

  const getSquadInfo = (editTeam: Team | null): SquadInfo => {
    const existingSquad = editTeam
      ? allPlayers.filter((p) => String(p.team_id) === String(editTeam.id))
      : []
    const existingIds = new Set(existingSquad.map((p) => String(p.id)))
    const currentSquad = [
      ...existingSquad,
      ...stagedPlayers.filter((p) => !existingIds.has(String(p.id))),
    ]
    const unassignedPlayers = allPlayers.filter(
      (p) => !p.team_id && !stagedPlayerIds.has(String(p.id)),
    )
    const filteredUnassigned = unassignedPlayers.filter(
      (p) =>
        playerSearch === "" ||
        p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
        p.position.toLowerCase().includes(playerSearch.toLowerCase()),
    )
    return { currentSquad, unassignedPlayers, filteredUnassigned }
  }

  return {
    originalTeam,
    stagedPlayers,
    stagedPlayerIds,
    playerSearch,
    showUnsavedWarning,
    setPlayerSearch,
    setShowUnsavedWarning,
    openEdit,
    resetSquad,
    handleAddPlayer,
    hasUnsavedChanges,
    setStagedAfterFailure,
    getSquadInfo,
  }
}
