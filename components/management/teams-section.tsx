"use client"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import type { Team, Player, ITeamsMutations } from "@/lib/api"
import { SkeletonRows, ErrorRow, EmptyRow } from "./table-states"
import { useSectionState, RowActions, DeleteConfirmDialog, EditDialogFooter, stateBadgeVariant } from "./shared"

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

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const squadOf = (team: Team) => players.filter((p) => String(p.team_id) === String(team.id))

  const handleSave = async () => {
    if (!editTeam) return
    const errors: Record<string, string> = {}
    if (!editTeam.name.trim()) errors.name = "Name is required"
    if (!editTeam.country.trim()) errors.country = "Country is required"
    if (!editTeam.city.trim()) errors.city = "City is required"
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setIsSaving(true)
    try {
      await api.update(editTeam.id, editTeam)
      onRefresh()
      setEditTeam(null)
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
                      onEdit={() => { setEditErrors({}); setEditTeam({ ...team }) }}
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
            <div className="space-y-5 py-4">
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
      <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
        <DialogContent>
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
            </FieldGroup>
          )}
          <EditDialogFooter isSaving={isSaving} onCancel={() => setEditTeam(null)} onSave={handleSave} />
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
