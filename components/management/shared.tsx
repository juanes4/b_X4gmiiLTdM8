"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DialogFooter } from "@/components/ui/dialog"
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react"

export function useSectionState<T>() {
  const [viewItem, setViewItem] = useState<T | null>(null)
  const [editItem, setEditItem] = useState<T | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  return { viewItem, setViewItem, editItem, setEditItem, deleteItem, setDeleteItem, editErrors, setEditErrors, isSaving, setIsSaving, isDeleting, setIsDeleting }
}

interface RowActionsProps {
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

export function RowActions({ onView, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onView}>
        <Eye className="h-4 w-4" /><span className="sr-only">View</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Delete</span>
      </Button>
    </div>
  )
}

interface DeleteConfirmDialogProps {
  item: { id: string; name: string } | null
  isDeleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteConfirmDialog({ item, isDeleting, onConfirm, onClose }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-medium">{item?.name}</span>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface EditDialogFooterProps {
  isSaving: boolean
  onCancel: () => void
  onSave: () => void
}

export function EditDialogFooter({ isSaving, onCancel, onSave }: EditDialogFooterProps) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
      </Button>
    </DialogFooter>
  )
}

const STATE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
}

export function stateBadgeVariant(state: string): "default" | "secondary" | "destructive" {
  return STATE_BADGE_VARIANTS[state] ?? "secondary"
}
