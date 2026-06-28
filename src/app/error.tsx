"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold tracking-tight">
          Algo salió <span className="text-danger">mal</span>
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="w-full rounded-xl border border-border px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text"
          >
            Volver al inicio
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 rounded-xl border border-border bg-surface-raised p-4 text-left">
            <summary className="cursor-pointer text-xs font-medium text-text-muted">
              Detalles del error
            </summary>
            <pre className="mt-3 overflow-auto text-xs text-text-muted">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
