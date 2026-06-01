"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stethoscope, Loader2, Shield } from "lucide-react";

export function LoginForm({ className, action, error, ...props }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    await action(formData);
    setIsLoading(false);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Logo y branding */}
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--aruba-turquoise)] to-[var(--aruba-orange)] rounded-2xl blur-xl opacity-50" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-aruba">
            <Stethoscope className="w-10 h-10 text-[var(--aruba-turquoise)]" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-hero">
            Odonto Reminder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de recordatorios para clínicas dentales
          </p>
        </div>
      </div>

      {/* Card de login con glassmorphism */}
      <Card className="glass-card border-0 overflow-hidden animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--aruba-turquoise)]/5 to-[var(--aruba-orange)]/5" />
        
        <CardHeader className="relative pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[var(--aruba-turquoise)]" />
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
          </div>
          <CardDescription>
            Ingrese sus credenciales para acceder al panel
          </CardDescription>
        </CardHeader>

        <CardContent className="relative">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Usuario
              </Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="Ingrese su usuario"
                required
                disabled={isLoading}
                className="input-aruba h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="input-aruba h-11"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 animate-scale-in">
                <p className="text-sm text-rose-600 dark:text-rose-400 text-center">
                  Credenciales inválidas. Intente nuevamente.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 btn-aruba text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar al sistema"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground animate-fade-in">
        Sistema seguro protegido con encriptación SSL
      </p>
    </div>
  );
}
