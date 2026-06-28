export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-text-muted">Cargando...</p>
    </main>
  );
}
