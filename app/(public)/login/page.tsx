"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("http://127.0.0.1:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: username,
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión")
      }

      sessionStorage.setItem("userSession", JSON.stringify(data.user))
      router.push("/dashboard")

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {/* Cambiamos el contenedor por un tag <form> */}
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-background border rounded-xl p-6 shadow-sm space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
          <p className="text-sm text-muted-foreground mt-1">Solo para personal autorizado</p>
        </div>

        {/* Alerta de error visual */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Usuario</label>
            <Input 
              type="text" 
              placeholder="admin@liga.com" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Contraseña</label>
            <Input 
              type="password" 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Botón tipo submit controlado por el estado de carga */}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Verificando..." : "Ingresar al Dashboard"}
        </Button>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Volver al Inicio
          </Link>
        </div>
      </form>
    </main>
  )
}