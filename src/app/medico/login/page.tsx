"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MedicoLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Error al iniciar sesión. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    router.push("/medico/panel");
    router.refresh();
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/8 blur-[120px]" />

      <div className="animate-fade relative w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Inicio
        </Link>

        <div className="rounded-2xl border border-border bg-surface-raised p-7">
          <h1 className="text-2xl font-bold tracking-tight">
            Panel <span className="text-accent">médico</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">Inicia sesión para ver tus citas</p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            {error && (
              <div
                role="alert"
                className="animate-pop rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-text-muted">
                Correo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm text-text-muted">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="press w-full rounded-xl bg-accent py-3.5 font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
