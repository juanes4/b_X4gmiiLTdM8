"use client"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import type { Match, IMatchesMutations } from "@/lib/api"
import { SkeletonRows, ErrorRow, EmptyRow } from "./table-states"
import { useSectionState, RowActions, DeleteConfirmDialog, EditDialogFooter } from "./shared"

interface MatchesSectionProps {
  matches: Match[]
  loading: boolean
  error: string | null
  searchQuery: string
  onRefresh: () => void
  api: IMatchesMutations
}

function resolveWinner(match: Match): string {
  if (Number(match.winner_id) === Number(match.team1_id)) return match.team1_name
  if (Number(match.winner_id) === Number(match.team2_id)) return match.team2_name
  if (match.score_team1 !== null) return "Draw"
  return "—"
}

export function MatchesSection({ matches, loading, error, searchQuery, onRefresh, api }: MatchesSectionProps) {
  const { viewItem: viewMatch, setViewItem: setViewMatch, editItem: editMatch, setEditItem: setEditMatch, deleteItem, setDeleteItem, editErrors, setEditErrors, isSaving, setIsSaving, isDeleting, setIsDeleting } = useSectionState<Match>()

  const filtered = matches.filter((m) =>
    m.team1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.team2_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.league_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSave = async () => {
    if (!editMatch) return
    const errors: Record<string, string> = {}
    if (editMatch.score_team1 === null) errors.score_team1 = "Score is required"
    if (editMatch.score_team2 === null) errors.score_team2 = "Score is required"
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setIsSaving(true)
    try {
      await api.updateResult(editMatch.id, editMatch.score_team1!, editMatch.score_team2!)
      onRefresh()
      setEditMatch(null)
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
              <TableHead>Match</TableHead>
              <TableHead className="hidden sm:table-cell">League</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="hidden md:table-cell">Winner</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows cols={5} />
              : error ? <ErrorRow cols={5} message={error} onRetry={onRefresh} />
              : filtered.length === 0 ? <EmptyRow cols={5} message={searchQuery ? "No matches match your search" : "No matches found"} />
              : filtered.map((match) => {
                const scoreStr = match.score_team1 !== null && match.score_team2 !== null
                  ? `${match.score_team1} - ${match.score_team2}` : "vs"
                return (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{match.team1_name} vs {match.team2_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {match.league_name
                        ? <Badge variant="secondary">{match.league_name}</Badge>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>{scoreStr}</TableCell>
                    <TableCell className="hidden md:table-cell">{resolveWinner(match)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewMatch(match)}
                        onEdit={() => { setEditErrors({}); setEditMatch({ ...match }) }}
                        onDelete={() => setDeleteItem({ id: match.id, name: `${match.team1_name} vs ${match.team2_name}` })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            }
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewMatch} onOpenChange={(open) => !open && setViewMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Details</DialogTitle>
            <DialogDescription>Full information about the selected match</DialogDescription>
          </DialogHeader>
          {viewMatch && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><p className="text-sm text-muted-foreground">Team 1</p><p className="font-medium">{viewMatch.team1_name}</p></div>
              <div><p className="text-sm text-muted-foreground">Team 2</p><p className="font-medium">{viewMatch.team2_name}</p></div>
              <div><p className="text-sm text-muted-foreground">League</p>
                {viewMatch.league_name ? <Badge variant="secondary">{viewMatch.league_name}</Badge> : <span className="text-muted-foreground">—</span>}
              </div>
              <div><p className="text-sm text-muted-foreground">Score</p>
                <p className="font-medium">
                  {viewMatch.score_team1 !== null && viewMatch.score_team2 !== null
                    ? `${viewMatch.score_team1} - ${viewMatch.score_team2}` : "Not played"}
                </p>
              </div>
              <div className="col-span-2"><p className="text-sm text-muted-foreground">Winner</p><p className="font-medium">{resolveWinner(viewMatch)}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMatch} onOpenChange={(open) => !open && setEditMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Result</DialogTitle>
            <DialogDescription>Make changes to the record below</DialogDescription>
          </DialogHeader>
          {editErrors._global && <p className="text-sm text-destructive px-1">{editErrors._global}</p>}
          {editMatch && (
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground mb-1">Team 1</p><p className="font-medium">{editMatch.team1_name}</p></div>
                <div><p className="text-sm text-muted-foreground mb-1">Team 2</p><p className="font-medium">{editMatch.team2_name}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-match-score1">Score Team 1</FieldLabel>
                  <Input id="edit-match-score1" type="number" min={0} value={editMatch.score_team1 ?? ""}
                    onChange={(e) => setEditMatch({ ...editMatch, score_team1: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-match-score2">Score Team 2</FieldLabel>
                  <Input id="edit-match-score2" type="number" min={0} value={editMatch.score_team2 ?? ""}
                    onChange={(e) => setEditMatch({ ...editMatch, score_team2: parseInt(e.target.value) || 0 })} />
                </Field>
              </div>
            </FieldGroup>
          )}
          <EditDialogFooter isSaving={isSaving} onCancel={() => setEditMatch(null)} onSave={handleSave} />
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
