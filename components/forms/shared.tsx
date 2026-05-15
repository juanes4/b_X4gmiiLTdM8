import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface FormHeaderProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function FormHeader({ icon, title, description }: FormHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface SubmitButtonProps {
  isSubmitting: boolean
  icon: React.ReactNode
  label: string
  loadingLabel: string
}

export function SubmitButton({ isSubmitting, icon, label, loadingLabel }: SubmitButtonProps) {
  return (
    <Button type="submit" className="w-full mt-6" disabled={isSubmitting} size="lg">
      {isSubmitting
        ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />{loadingLabel}</>
        : <>{icon}{label}</>}
    </Button>
  )
}
