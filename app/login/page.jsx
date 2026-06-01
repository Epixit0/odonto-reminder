import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { loginAction } from "./actions"

export default async function Page({ searchParams }) {
  const authenticated = await isAuthenticated()
  if (authenticated) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const showError = params?.error === "1"

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Fondo gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Círculos decorativos */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--aruba-turquoise)]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[var(--aruba-orange)]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-[var(--aruba-turquoise)]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Patrón de puntos sutil */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Contenido */}
      <div className="relative z-10 w-full max-w-md px-6">
        <LoginForm action={loginAction} error={showError} />
      </div>
    </div>
  )
}
