import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Reserva en minutos",
    desc: "Elige médico, día y hora sin llamadas ni esperas.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: "Pago seguro",
    desc: "Paga con PayPal de forma rápida y protegida.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Confirmación al instante",
    desc: "Recibe un email con los detalles y enlace a Google Calendar.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Medi<span className="text-accent">Reserva</span>
            </h1>
            <p className="text-xs text-text-subtle">Citas médicas en línea</p>
          </div>
          <Link
            href="/medico/login"
            className="press rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            Acceso médico
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="animate-fade relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Sin registro · Confirmación inmediata
          </span>

          <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Tu cita médica,
            <br />
            <span className="text-accent">a un clic</span>
          </h2>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-text-muted sm:text-lg">
            Agenda con especialistas de confianza, paga en línea y recibe tu confirmación al correo.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/reservar"
              className="press w-full rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover sm:w-auto"
            >
              Agendar cita
            </Link>
            <a
              href="#como-funciona"
              className="press w-full rounded-xl border border-border px-8 py-3.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text sm:w-auto"
            >
              Cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="border-t border-border-subtle px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-text-subtle">
            Cómo funciona
          </p>
          <h3 className="mb-12 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Simple, rápido y seguro
          </h3>

          <div className="stagger grid gap-4 sm:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-surface-raised p-6 transition-colors hover:border-border-strong"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  {f.icon}
                </div>
                <p className="mb-1 text-xs font-medium tabular-nums text-text-subtle">Paso {i + 1}</p>
                <h4 className="mb-2 font-semibold">{f.title}</h4>
                <p className="text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border-subtle px-4 py-20 sm:px-6">
        <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-surface-raised p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">¿Listo para tu consulta?</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
              No necesitas crear cuenta. Solo elige tu horario y confirma con PayPal.
            </p>
            <Link
              href="/reservar"
              className="press mt-7 inline-block w-full rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover sm:w-auto"
            >
              Agendar cita ahora
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-subtle px-4 py-8 text-center text-xs text-text-subtle">
        © {new Date().getFullYear()} MediReserva
      </footer>
    </main>
  );
}
