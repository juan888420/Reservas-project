import BookingFlow from "@/components/BookingFlow";
import Link from "next/link";

export const metadata = {
  title: "Agendar cita — MediReserva",
  description: "Reserva tu cita médica en línea",
};

export default function ReservarPage() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="group inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 text-text-subtle transition-colors group-hover:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg font-bold tracking-tight">
              Medi<span className="text-accent">Reserva</span>
            </span>
          </Link>
          <Link
            href="/medico/login"
            className="press rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            Acceso médico
          </Link>
        </div>
      </header>

      <section className="px-4 py-10 sm:px-6">
        <div className="animate-fade mx-auto max-w-lg">
          <BookingFlow />
        </div>
      </section>
    </main>
  );
}
