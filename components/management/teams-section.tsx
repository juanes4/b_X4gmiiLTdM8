"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import { Search } from "lucide-react"
import type { Team, Player, ITeamsMutations } from "@/lib/api"
import { SkeletonRows, ErrorRow, EmptyRow } from "./table-states"
import { useSectionState, RowActions, DeleteConfirmDialog, EditDialogFooter, stateBadgeVariant } from "./shared"
import { LogoInput } from "@/components/ui/logo-input"

const STATES = ["active", "inactive", "suspended"]

interface TeamsSectionProps {
  teams: Team[]
  players: Player[]
  loading: boolean
  error: string | null
  searchQuery: string
  onRefresh: () => void
  api: ITeamsMutations
}

export function TeamsSection({ teams, players, loading, error, searchQuery, onRefresh, api }: TeamsSectionProps) {
  const { viewItem: viewTeam, setViewItem: setViewTeam, editItem: editTeam, setEditItem: setEditTeam, deleteItem, setDeleteItem, editErrors, setEditErrors, isSaving, setIsSaving, isDeleting, setIsDeleting } = useSectionState<Team>()

  const [originalTeam, setOriginalTeam] = useState<Team | null>(null)
  const [stagedPlayers, setStagedPlayers] = useState<Player[]>([])
  const [stagedPlayerIds, setStagedPlayerIds] = useState<Set<string>>(new Set())
  const [playerSearch, setPlayerSearch] = useState("")
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const squadOf = (team: Team) => players.filter((p) => String(p.team_id) === String(team.id))

  const isValidLogoValue = (s: string): boolean => {
    if (!s) return true
    if (s.startsWith("/uploads/")) return true
    try { new URL(s); return true } catch { return false }
  }

  const hasUnsavedChanges = (): boolean => {
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

  const openEdit = (team: Team) => {
    setEditErrors({})
    setStagedPlayers([])
    setStagedPlayerIds(new Set())
    setPlayerSearch("")
    setOriginalTeam({ ...team })
    setEditTeam({ ...team })
  }

  const closeEdit = () => {
    setEditTeam(null)
    setOriginalTeam(null)
    setStagedPlayers([])
    setStagedPlayerIds(new Set())
    setPlayerSearch("")
    setShowUnsavedWarning(false)
  }

  const handleCloseAttempt = () => {
    if (isSaving) return
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true)
    } else {
      closeEdit()
    }
  }

  const handleAddPlayer = (playerId: string) => {
    if (!playerId || stagedPlayerIds.has(playerId)) return
    const player = players.find((p) => String(p.id) === playerId)
    if (!player) return
    setStagedPlayers((prev) => [...prev, player])
    setStagedPlayerIds((prev) => new Set([...prev, playerId]))
    setPlayerSearch("")
  }

  const handleSave = async () => {
    if (!editTeam) return
    const errors: Record<string, string> = {}
    if (!editTeam.name.trim()) errors.name = "Name is required"
    if (!editTeam.country.trim()) errors.country = "Country is required"
    if (!editTeam.city.trim()) errors.city = "City is required"
    if (editTeam.logo && !isValidLogoValue(editTeam.logo)) errors.logo = "The logo link doesn't look like a valid web address"
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setIsSaving(true)
    try {
      await api.update(editTeam.id, editTeam)

      if (stagedPlayers.length > 0) {
        const results = await Promise.allSettled(
          stagedPlayers.map((p) => api.addPlayer(editTeam.id, String(p.id)))
        )
        const failedIndices = results
          .map((r, i) => (r.status === "rejected" ? i : -1))
          .filter((i) => i !== -1)

        if (failedIndices.length > 0) {
          const stillStaged = failedIndices.map((i) => stagedPlayers[i])
          setStagedPlayers(stillStaged)
          setStagedPlayerIds(new Set(stillStaged.map((p) => String(p.id))))
          const reason = (results[failedIndices[0]] as PromiseRejectedResult).reason
          const msg = reason instanceof Error ? reason.message : String(reason)
          setEditErrors({ _global: `${failedIndices.length} player(s) could not be added: ${msg}` })
          onRefresh()
          return
        }
      }

      onRefresh()
      closeEdit()
    } catch (err) {
      setEditErrors({ _global: err instanceof Error ? err.message : "Save failed" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setIsDeleting(true)
    try {
      await api.delete(deleteItem.id)
      onRefresh()
    } finally {
      setIsDeleting(false)
      setDeleteItem(null)
    }
  }

  // Computed values for the edit dialog
  const existingSquad = editTeam ? squadOf(editTeam) : []
  const existingIds = new Set(existingSquad.map((p) => String(p.id)))
  const currentSquad = [
    ...existingSquad,
    ...stagedPlayers.filter((p) => !existingIds.has(String(p.id))),
  ]
  const unassignedPlayers = players.filter(
    (p) => !p.team_id && !stagedPlayerIds.has(String(p.id))
  )
  const filteredUnassigned = unassignedPlayers.filter(
    (p) =>
      playerSearch === "" ||
      p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.position.toLowerCase().includes(playerSearch.toLowerCase())
  )

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Country</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows cols={5} />
              : error ? <ErrorRow cols={5} message={error} onRetry={onRefresh} />
              : filtered.length === 0 ? <EmptyRow cols={5} message={searchQuery ? "No teams match your search" : "No teams found"} />
              : filtered.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">
                    {team.name}
                    <span className="ml-1.5 text-muted-foreground text-xs">({team.abbreviation})</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{team.country}</TableCell>
                  <TableCell className="hidden sm:table-cell">{team.city}</TableCell>
                  <TableCell>
                    <Badge variant={stateBadgeVariant(team.state)}>{team.state}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onView={() => setViewTeam(team)}
                      onEdit={() => openEdit(team)}
                      onDelete={() => setDeleteItem({ id: team.id, name: team.name })}
                    />
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewTeam} onOpenChange={(open) => !open && setViewTeam(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Details</DialogTitle>
            <DialogDescription>Full information about the selected team</DialogDescription>
          </DialogHeader>
          {viewTeam && (
            <div className="space-y-5 py-4 max-h-[70vh] overflow-y-auto pr-1">
              {viewTeam.logo && (
                <div className="flex justify-center">
                  <img
                    src={viewTeam.logo}
                    alt={`${viewTeam.name} logo`}
                    className="h-24 w-24 object-contain rounded-lg border bg-muted/40 p-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{viewTeam.name}</p></div>
                <div><p className="text-sm text-muted-foreground">Abbreviation</p><p className="font-medium">{viewTeam.abbreviation}</p></div>
                <div><p className="text-sm text-muted-foreground">Country</p><p className="font-medium">{viewTeam.country}</p></div>
                <div><p className="text-sm text-muted-foreground">City</p><p className="font-medium">{viewTeam.city}</p></div>
                <div><p className="text-sm text-muted-foreground">State</p><Badge variant={stateBadgeVariant(viewTeam.state)}>{viewTeam.state}</Badge></div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Squad <span className="text-foreground">({squadOf(viewTeam).length})</span>
                </p>
                {squadOf(viewTeam).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players assigned to this team.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {squadOf(viewTeam).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-6 shrink-0">#{p.number ?? "—"}</span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">{p.position}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) handleCloseAttempt() }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Make changes to the record below</DialogDescription>
          </DialogHeader>
          {editErrors._global && <p className="text-sm text-destructive px-1">{editErrors._global}</p>}
          {editTeam && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-team-name">Team Name</FieldLabel>
                <Input id="edit-team-name" value={editTeam.name}
                  onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                  className={editErrors.name ? "border-destructive" : ""} />
                {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-team-country">Country</FieldLabel>
                  <Input id="edit-team-country" value={editTeam.country}
                    onChange={(e) => setEditTeam({ ...editTeam, country: e.target.value })}
                    className={editErrors.country ? "border-destructive" : ""} />
                  {editErrors.country && <FieldError>{editErrors.country}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-team-city">City</FieldLabel>
                  <Input id="edit-team-city" value={editTeam.city}
                    onChange={(e) => setEditTeam({ ...editTeam, city: e.target.value })}
                    className={editErrors.city ? "border-destructive" : ""} />
                  {editErrors.city && <FieldError>{editErrors.city}</FieldError>}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-team-abbr">Abbreviation</FieldLabel>
                  <Input id="edit-team-abbr" value={editTeam.abbreviation} maxLength={5}
                    onChange={(e) => setEditTeam({ ...editTeam, abbreviation: e.target.value.toUpperCase() })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-team-state">State</FieldLabel>
                  <Select value={editTeam.state} onValueChange={(v) => setEditTeam({ ...editTeam, state: v })}>
                    <SelectTrigger id="edit-team-state"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Logo (optional)</FieldLabel>
                <LogoInput
                  value={editTeam.logo ?? ""}
                  onChange={(url) => setEditTeam({ ...editTeam, logo: url })}
                  disabled={isSaving}
                  error={!!editErrors.logo}
                />
                {editErrors.logo && <FieldError>{editErrors.logo}</FieldError>}
              </Field>

              {/* Squad management */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Squad <span className="text-muted-foreground">({currentSquad.length})</span>
                  </p>
                  {currentSquad.length < 11 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {11 - currentSquad.length} more needed for league eligibility
                    </span>
                  )}
                </div>

                <Select value="" onValueChange={handleAddPlayer} disabled={unassignedPlayers.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      unassignedPlayers.length === 0 ? "No available players" : "Add a player..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="flex items-center border-b px-3 pb-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Search players..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filteredUnassigned.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        {playerSearch ? "No players found" : "No available players"}
                      </div>
                    ) : (
                      filteredUnassigned.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="font-medium text-muted-foreground">#{p.number ?? "—"}</span>
                          <span className="ml-2">{p.name}</span>
                          <span className="ml-2 text-muted-foreground text-xs">· {p.position}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {currentSquad.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto pr-0.5">
                    {currentSquad.map((p) => {
                      const isStaged = stagedPlayerIds.has(String(p.id))
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs ${
                            isStaged
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                              : "border-border bg-muted/40"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-muted-foreground w-5 shrink-0">#{p.number ?? "—"}</span>
                            <span className="truncate font-medium">{p.name}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ml-1.5 shrink-0 ${isStaged ? "border-emerald-400 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300" : ""}`}
                          >
                            {p.position}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No players yet. Use the dropdown above to add players.</p>
                )}

                {stagedPlayers.length > 0 && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    {stagedPlayers.length} player{stagedPlayers.length > 1 ? "s" : ""} staged — click Save Changes to confirm
                  </p>
                )}
              </div>
            </FieldGroup>
          )}
          <EditDialogFooter isSaving={isSaving} onCancel={handleCloseAttempt} onSave={handleSave} />
        </DialogContent>
      </Dialog>

      {/* Unsaved changes warning */}
      <Dialog open={showUnsavedWarning} onOpenChange={(open) => { if (!open) setShowUnsavedWarning(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. If you close now, all changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowUnsavedWarning(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={closeEdit}>
              Discard changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        item={deleteItem}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteItem(null)}
      />
    </>
  )
}
