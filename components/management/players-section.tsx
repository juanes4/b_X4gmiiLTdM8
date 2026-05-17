"use client"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import type { Player, Team, IPlayersMutations } from "@/lib/api"
import { SkeletonRows, ErrorRow, EmptyRow } from "./table-states"
import { useSectionState, RowActions, DeleteConfirmDialog, EditDialogFooter, stateBadgeVariant } from "./shared"
import { LogoInput } from "@/components/ui/logo-input"
import { RequiredMark, RequiredNote } from "../forms/shared"

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]

interface PlayersSectionProps {
  players: Player[]
  teams: Team[]
  loading: boolean
  error: string | null
  searchQuery: string
  onRefresh: () => void
  api: IPlayersMutations
}

export function PlayersSection({ players, teams, loading, error, searchQuery, onRefresh, api }: PlayersSectionProps) {
  const { viewItem: viewPlayer, setViewItem: setViewPlayer, editItem: editPlayer, setEditItem: setEditPlayer, deleteItem, setDeleteItem, editErrors, setEditErrors, isSaving, setIsSaving, isDeleting, setIsDeleting } = useSectionState<Player>()

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const teamOf = (player: Player) => teams.find((t) => String(t.id) === String(player.team_id)) ?? null
  const teamName = (player: Player) => teamOf(player)?.name ?? "—"

  const handleSave = async () => {
    if (!editPlayer) return
    const errors: Record<string, string> = {}
    if (!editPlayer.name.trim()) errors.name = "Name is required"
    if (editPlayer.age < 15 || editPlayer.age > 50) errors.age = "Age must be 15–50"
    if (!editPlayer.position) errors.position = "Position is required"
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setIsSaving(true)
    try {
      await api.update(editPlayer.id, editPlayer)
      onRefresh()
      setEditPlayer(null)
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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-20">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Position</TableHead>
              <TableHead className="hidden md:table-cell">Age</TableHead>
              <TableHead>#</TableHead>
              <TableHead className="hidden lg:table-cell">Team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows cols={6} />
              : error ? <ErrorRow cols={6} message={error} onRetry={onRefresh} />
              : filtered.length === 0 ? <EmptyRow cols={6} message={searchQuery ? "No players match your search" : "No players found"} />
              : filtered.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{player.position}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{player.age ?? "—"}</TableCell>
                  <TableCell>{player.number ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{teamName(player)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onView={() => setViewPlayer(player)}
                      onEdit={() => { setEditErrors({}); setEditPlayer({ ...player }) }}
                      onDelete={() => setDeleteItem({ id: player.id, name: player.name })}
                    />
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewPlayer} onOpenChange={(open) => !open && setViewPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Player Details</DialogTitle>
            <DialogDescription>Full information about the selected player</DialogDescription>
          </DialogHeader>
          {viewPlayer && (
            <div className="space-y-5 py-4">
              {viewPlayer.photo && (
                <div className="flex justify-center">
                  <img
                    src={viewPlayer.photo}
                    alt={`${viewPlayer.name} photo`}
                    className="h-24 w-24 object-cover rounded-full border bg-muted/40 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{viewPlayer.name}</p></div>
                <div><p className="text-sm text-muted-foreground">Age</p><p className="font-medium">{viewPlayer.age ?? "—"}</p></div>
                <div><p className="text-sm text-muted-foreground">Position</p><Badge variant="outline">{viewPlayer.position}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Jersey Number</p><p className="font-medium">#{viewPlayer.number ?? "—"}</p></div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Team</p>
                {teamOf(viewPlayer) ? (
                  <div className="rounded-md border bg-muted/40 px-4 py-3 grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{teamOf(viewPlayer)!.name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Abbreviation</p><p className="font-medium">{teamOf(viewPlayer)!.abbreviation}</p></div>
                    <div><p className="text-xs text-muted-foreground">Country</p><p className="font-medium">{teamOf(viewPlayer)!.country}</p></div>
                    <div><p className="text-xs text-muted-foreground">City</p><p className="font-medium">{teamOf(viewPlayer)!.city}</p></div>
                    <div><p className="text-xs text-muted-foreground">State</p><Badge variant={stateBadgeVariant(teamOf(viewPlayer)!.state)}>{teamOf(viewPlayer)!.state}</Badge></div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">This player is not assigned to any team.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(open) => !open && setEditPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Make changes to the record below</DialogDescription>
          </DialogHeader>
          {editErrors._global && <p className="text-sm text-destructive px-1">{editErrors._global}</p>}
          <RequiredNote />
          {editPlayer && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-player-name">Name<RequiredMark /></FieldLabel>
                <Input id="edit-player-name" value={editPlayer.name}
                  onChange={(e) => setEditPlayer({ ...editPlayer, name: e.target.value })}
                  className={editErrors.name ? "border-destructive" : ""} />
                {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-player-age">Age<RequiredMark /></FieldLabel>
                  <Input id="edit-player-age" type="number" min={15} max={50} value={editPlayer.age}
                    onChange={(e) => setEditPlayer({ ...editPlayer, age: parseInt(e.target.value) || 0 })}
                    className={editErrors.age ? "border-destructive" : ""} />
                  {editErrors.age && <FieldError>{editErrors.age}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-player-number">Jersey Number</FieldLabel>
                  <Input id="edit-player-number" type="number" min={1} max={99} value={editPlayer.number}
                    onChange={(e) => setEditPlayer({ ...editPlayer, number: parseInt(e.target.value) || 0 })} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="edit-player-position">Position<RequiredMark /></FieldLabel>
                <Select value={editPlayer.position} onValueChange={(v) => setEditPlayer({ ...editPlayer, position: v })}>
                  <SelectTrigger id="edit-player-position" className={editErrors.position ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editErrors.position && <FieldError>{editErrors.position}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Photo (optional)</FieldLabel>
                <LogoInput
                  value={editPlayer.photo ?? ""}
                  onChange={(url) => setEditPlayer({ ...editPlayer, photo: url })}
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
          )}
          <EditDialogFooter isSaving={isSaving} onCancel={() => setEditPlayer(null)} onSave={handleSave} />
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
