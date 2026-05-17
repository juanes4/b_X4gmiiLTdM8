"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trophy, Calendar, History, ArrowRight } from "lucide-react"

// Definimos los tipos de secciones disponibles
type Section = "bienvenida" | "matches" | "leagues" | "historial"

export default function InicioPage() {
  const [currentSection, setCurrentSection] = useState<Section>("bienvenida")

  return (
    <main className="min-h-screen bg-muted/30 text-foreground flex flex-col">
      
      {/* 1. MENÚ DE NAVEGACIÓN SUPERIOR */}
      <header className="w-full bg-background border-b sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo / Nombre */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setCurrentSection("bienvenida")}
          >
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">FootPass</span>
          </div>

          {/* Botones de navegación */}
          <nav className="flex items-center gap-2">
            <Button 
              variant={currentSection === "matches" ? "default" : "ghost"}
              onClick={() => setCurrentSection("matches")}
              className="font-medium"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Matches
            </Button>

            <Button 
              variant={currentSection === "leagues" ? "default" : "ghost"}
              onClick={() => setCurrentSection("leagues")}
              className="font-medium"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leagues
            </Button>

            <Button 
              variant={currentSection === "historial" ? "default" : "ghost"}
              onClick={() => setCurrentSection("historial")}
              className="font-medium"
            >
              <History className="mr-2 h-4 w-4" />
              Historial
            </Button>
          </nav>
        </div>
      </header>

      {/* 2. CONTENIDO CENTRAL DINÁMICO */}
      <section className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center items-center">
        
        {/* SECCIÓN A: BIENVENIDA */}
        {currentSection === "bienvenida" && (
          <div className="bg-background border rounded-2xl p-8 md:p-12 text-center shadow-md max-w-2xl space-y-6 animate-in fade-in duration-300">
            <div className="inline-flex p-3 bg-primary/10 text-primary rounded-full mb-2">
              <Trophy className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              ¡Bienvenido a la Plataforma de Ligas!
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Explora los partidos en vivo, las tablas de clasificación de las ligas actuales y revisa el historial completo de torneos anteriores desde el menú superior.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Button onClick={() => setCurrentSection("matches")} size="lg">
                Ver partidos de hoy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* SECCIÓN B: MATCHES (Tabla de Partidos) */}
        {currentSection === "matches" && (
          <div className="w-full bg-background border rounded-2xl p-6 shadow-md animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Partidos de la Jornada</h2>
              <p className="text-muted-foreground text-sm">Encuentros programados y resultados recientes.</p>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold tracking-wider border-b">
                  <tr>
                    <th className="px-6 py-4">Local</th>
                    <th className="px-6 py-4 text-center">Resultado</th>
                    <th className="px-6 py-4 text-right">Visitante</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-semibold">FC Barcelona</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-base bg-muted/20">2 - 1</td>
                    <td className="px-6 py-4 text-right font-semibold">Real Madrid</td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">Finalizado</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-semibold">Manchester City</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-base bg-muted/20">0 - 0</td>
                    <td className="px-6 py-4 text-right font-semibold">Arsenal</td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30">En Vivo (75')</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-semibold">Juventus</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-base bg-muted/20">vs</td>
                    <td className="px-6 py-4 text-right font-semibold">AC Milan</td>
                    <td className="px-6 py-4 text-center text-xs font-medium text-muted-foreground">20:00 hrs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN C: LEAGUES */}
        {currentSection === "leagues" && (
          <div className="w-full bg-background border rounded-2xl p-6 shadow-md animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Tabla de Clasificación</h2>
              <p className="text-muted-foreground text-sm">Posiciones actuales de los equipos en la liga regular.</p>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold border-b">
                  <tr>
                    <th className="px-6 py-4 text-center w-16">Pos</th>
                    <th className="px-6 py-4">Equipo</th>
                    <th className="px-6 py-4 text-center">PJ</th>
                    <th className="px-6 py-4 text-center">PG</th>
                    <th className="px-6 py-4 text-center">PE</th>
                    <th className="px-6 py-4 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 text-center font-bold text-amber-500">1</td>
                    <td className="px-6 py-4 font-semibold">FC Barcelona</td>
                    <td className="px-6 py-4 text-center">28</td>
                    <td className="px-6 py-4 text-center">22</td>
                    <td className="px-6 py-4 text-center">3</td>
                    <td className="px-6 py-4 text-center font-bold text-primary">69</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 text-center font-bold text-slate-400">2</td>
                    <td className="px-6 py-4 font-semibold">Real Madrid</td>
                    <td className="px-6 py-4 text-center">28</td>
                    <td className="px-6 py-4 text-center">20</td>
                    <td className="px-6 py-4 text-center">4</td>
                    <td className="px-6 py-4 text-center font-bold text-primary">64</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-6 py-4 text-center font-bold text-amber-700">3</td>
                    <td className="px-6 py-4 font-semibold">Manchester City</td>
                    <td className="px-6 py-4 text-center">27</td>
                    <td className="px-6 py-4 text-center">19</td>
                    <td className="px-6 py-4 text-center">5</td>
                    <td className="px-6 py-4 text-center font-bold text-primary">62</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN D: HISTORIAL */}
        {currentSection === "historial" && (
          <div className="w-full bg-background border rounded-2xl p-6 shadow-md animate-in fade-in duration-300 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Historial de Campeones</h2>
              <p className="text-muted-foreground text-sm">Palmarés y campeones de ediciones pasadas.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border rounded-xl p-4 flex items-center justify-between bg-muted/10">
                <div>
                  <h4 className="font-bold text-lg">Temporada 2024/2025</h4>
                  <p className="text-sm text-muted-foreground">Campeón: Manchester City</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
              <div className="border rounded-xl p-4 flex items-center justify-between bg-muted/10">
                <div>
                  <h4 className="font-bold text-lg">Temporada 2023/2024</h4>
                  <p className="text-sm text-muted-foreground">Campeón: Real Madrid</p>
                </div>
                <Trophy className="h-8 w-8 text-slate-400 opacity-80" />
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  )
}