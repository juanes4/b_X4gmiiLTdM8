"use client"

// SRP: este hook tiene una única responsabilidad — debounce y persistencia
// de metadatos de partido (venue, referee, scheduled_at) vía API.
// No sabe nada de UI ni de cómo se obtienen los datos.
// DIP: depende de IMatchesMetadata (abstracción), no de matchesApi (implementación concreta).

import { useRef, useCallback, useState } from "react"
import type { IMatchesMetadata } from "@/lib/api"

type MetadataSnapshot = { venue: string; referee: string; scheduled_at: string }

interface UseAutoSaveReturn {
  autoSavingId: string | null
  autoSavedId: string | null
  /** Agenda un auto-guardado para `matchId`. `getData` se invoca al disparar
   *  el timer (no en el momento de agendar), garantizando valores frescos. */
  scheduleAutoSave: (matchId: string, getData: () => MetadataSnapshot) => void
}

export function useAutoSave(api: IMatchesMetadata): UseAutoSaveReturn {
  const [autoSavingId, setAutoSavingId] = useState<string | null>(null)
  const [autoSavedId, setAutoSavedId] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const scheduleAutoSave = useCallback(
    (matchId: string, getData: () => MetadataSnapshot) => {
      if (timers.current[matchId]) clearTimeout(timers.current[matchId])
      timers.current[matchId] = setTimeout(async () => {
        const inp = getData()
        const meta: { scheduled_at?: string; venue?: string; referee?: string } = {}
        if (inp.scheduled_at) meta.scheduled_at = inp.scheduled_at
        if (inp.venue.trim()) meta.venue = inp.venue.trim()
        if (inp.referee.trim()) meta.referee = inp.referee.trim()

        setAutoSavingId(matchId)
        try {
          await api.updateMetadata(matchId, meta)
          setAutoSavedId(matchId)
          setTimeout(
            () => setAutoSavedId((prev) => (prev === matchId ? null : prev)),
            2500,
          )
        } catch {
          // silently ignore — el usuario no queda bloqueado
        } finally {
          setAutoSavingId((prev) => (prev === matchId ? null : prev))
        }
      }, 1200)
    },
    [],
  )

  return { autoSavingId, autoSavedId, scheduleAutoSave }
}
