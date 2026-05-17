import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NormalUserView() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">Calendario de la Liga</h1>
            <p className="text-muted-foreground">Resultados en vivo y próximos partidos</p>
          </div>
          <Link href="/">
            <Button variant="ghost">Volver al Inicio</Button>
          </Link>
        </header>

        {/* Contenido público simulado */}
        <div className="grid gap-4">
          <div className="border rounded-lg p-4 flex justify-between items-center bg-muted/10">
            <span className="font-semibold">FC Barcelona</span>
            <span className="bg-muted px-3 py-1 rounded text-sm font-mono font-bold">2 - 1</span>
            <span className="font-semibold">Real Madrid</span>
          </div>
          <div className="border rounded-lg p-4 flex justify-between items-center bg-muted/10">
            <span className="font-semibold">Manchester City</span>
            <span className="bg-muted px-3 py-1 rounded text-sm font-mono font-bold">0 - 0</span>
            <span className="font-semibold">Arsenal</span>
          </div>
        </div>
      </div>
    </main>
  )
}