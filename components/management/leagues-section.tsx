"use client"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field"
import type { League, ILeaguesMutations } from "@/lib/api"
import { SkeletonRows, ErrorRow, EmptyRow } from "./table-states"
import { useSectionState, RowActions, DeleteConfirmDialog, EditDialogFooter, stateBadgeVariant } from "./shared"

const STATES = ["active", "inactive", "suspended"]

interface LeaguesSectionProps {
  leagues: League[]
  loading: boolean
  error: string | null
  searchQuery: string
  onRefresh: () => void
  api: ILeaguesMutations
}

export function LeaguesSection({ leagues, loading, error, searchQuery, onRefresh, api }: LeaguesSectionProps) {
  const { viewItem: viewLeague, setViewItem: setViewLeague, editItem: editLeague, setEditItem: setEditLeague, deleteItem, setDeleteItem, editErrors, setEditErrors, isSaving, setIsSaving, isDeleting, setIsDeleting } = useSectionState<League>()

  const filtered = leagues.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSave = async () => {
    if (!editLeague) return
    const errors: Record<string, string> = {}
    if (!editLeague.name.trim()) errors.name = "Name is required"
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setIsSaving(true)
    try {
      await api.update(editLeague.id, {
        name: editLeague.name,
        state: editLeague.state,
        current_round: editLeague.current_round,
      })
      onRefresh()
      setEditLeague(null)
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
              <TableHead>Teams</TableHead>
              <TableHead className="hidden sm:table-cell">Round</TableHead>
              <TableHead className="hidden md:table-cell">State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows cols={5} />
              : error ? <ErrorRow cols={5} message={error} onRetry={onRefresh} />
              : filtered.length === 0 ? <EmptyRow cols={5} message={searchQuery ? "No leagues match your search" : "No leagues found"} />
              : filtered.map((league) => (
                <TableRow key={league.id}>
                  <TableCell className="font-medium">{league.name}</TableCell>
                  <TableCell>{league.teams?.length ?? 0}</TableCell>
                  <TableCell className="hidden sm:table-cell">{league.current_round}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={stateBadgeVariant(league.state)}>{league.state}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onView={() => setViewLeague(league)}
                      onEdit={() => { setEditErrors({}); setEditLeague({ ...league }) }}
                      onDelete={() => setDeleteItem({ id: league.id, name: league.name })}
                    />
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewLeague} onOpenChange={(open) => !open && setViewLeague(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>League Details</DialogTitle>
            <DialogDescription>Full information about the selected league</DialogDescription>
          </DialogHeader>
          {viewLeague && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{viewLeague.name}</p></div>
              <div><p className="text-sm text-muted-foreground">Teams</p><p className="font-medium">{viewLeague.teams?.length ?? 0}</p></div>
              <div><p className="text-sm text-muted-foreground">Current Round</p><p className="font-medium">{viewLeague.current_round}</p></div>
              <div><p className="text-sm text-muted-foreground">State</p><Badge variant={stateBadgeVariant(viewLeague.state)}>{viewLeague.state}</Badge></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLeague} onOpenChange={(open) => !open && setEditLeague(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>Make changes to the record below</DialogDescription>
          </DialogHeader>
          {editErrors._global && <p className="text-sm text-destructive px-1">{editErrors._global}</p>}
          {editLeague && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-league-name">League Name</FieldLabel>
                <Input id="edit-league-name" value={editLeague.name}
                  onChange={(e) => setEditLeague({ ...editLeague, name: e.target.value })}
                  className={editErrors.name ? "border-destructive" : ""} />
                {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-league-round">Current Round</FieldLabel>
                  <Input id="edit-league-round" type="number" min={0} value={editLeague.current_round}
                    onChange={(e) => setEditLeague({ ...editLeague, current_round: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-league-state">State</FieldLabel>
                  <Select value={editLeague.state} onValueChange={(v) => setEditLeague({ ...editLeague, state: v })}>
                    <SelectTrigger id="edit-league-state"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
          )}
          <EditDialogFooter isSaving={isSaving} onCancel={() => setEditLeague(null)} onSave={handleSave} />
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
