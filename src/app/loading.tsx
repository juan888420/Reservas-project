export default function Loading() {
  return (
    <main className="animate-fade flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-text-muted">
        Medi<span className="text-accent">Reserva</span>
      </p>
    </main>
  );
}
