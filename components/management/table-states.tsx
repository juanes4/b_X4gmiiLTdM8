import { Button } from "@/components/ui/button"
import { TableRow, TableCell } from "@/components/ui/table"
import { AlertCircle, RefreshCw } from "lucide-react"

export function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function ErrorRow({ cols, message, onRetry }: { cols: number; message: string; onRetry: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">{message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-muted-foreground py-8">
        {message}
      </TableCell>
    </TableRow>
  )
}
