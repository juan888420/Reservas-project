import BookingFlow from "@/components/BookingFlow";
import Link from "next/link";

export const metadata = {
  title: "Agendar cita — MediReserva",
  description: "Reserva tu cita médica en línea",
};

export default function ReservarPage() {
  return (
    <main className="min-h-dvh">
      <header className="border-b border-border-subtle px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/" className="group">
            <h1 className="text-lg font-bold tracking-tight">
              Medi<span className="text-accent">Reserva</span>
            </h1>
            <p className="text-xs text-text-muted group-hover:text-text transition-colors">
              ← Volver al inicio
            </p>
          </Link>
          <Link
            href="/medico/login"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/50 hover:text-text"
          >
            Acceso médico
          </Link>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-6 text-xl font-semibold">Agendar cita</h2>
          <BookingFlow />
        </div>
      </section>
    </main>
  );
}
