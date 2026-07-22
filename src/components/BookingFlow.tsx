"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { Medico, Slot } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

const STEPS = ["Médico", "Horario", "Datos", "Pago"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initials(nombre: string) {
  const parts = nombre.replace(/^(Dr|Dra)\.?\s+/i, "").trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatFechaLarga(fecha: string) {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fechaParts(fecha: string) {
  const d = new Date(fecha + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("es-ES", { weekday: "short" }),
    day: d.toLocaleDateString("es-ES", { day: "numeric" }),
    month: d.toLocaleDateString("es-ES", { month: "short" }),
  };
}

export default function BookingFlow() {
  const [step, setStep] = useState<Step>(1);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [citaId, setCitaId] = useState<string | null>(null);
  const [monto, setMonto] = useState<number>(0);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medicos")
      .then((r) => r.json())
      .then(setMedicos)
      .catch(() => setError("Error al cargar los médicos"))
      .finally(() => setMedicosLoading(false));
  }, []);

  const loadSlots = useCallback(async (medicoId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slots?medico_id=${medicoId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cargar horarios");
      }
      const data = await res.json();
      setSlots(data);
    } catch {
      setError("No se pudieron cargar los horarios");
    } finally {
      setLoading(false);
    }
  }, []);

  const fechasDisponibles = useMemo(() => {
    const fechas = [...new Set(slots.map((s) => s.fecha))];
    return fechas.sort();
  }, [slots]);

  const slotsDelDia = useMemo(() => {
    if (!selectedFecha) return [];
    return slots.filter((s) => s.fecha === selectedFecha);
  }, [slots, selectedFecha]);

  const emailValido = EMAIL_RE.test(email.trim());
  const nombreValido = pacienteNombre.trim().length >= 2;

  const selectMedico = (medico: Medico) => {
    setSelectedMedico(medico);
    setSelectedFecha(null);
    setSelectedSlot(null);
    setSlots([]);
    loadSlots(medico.id);
    setStep(2);
    setError(null);
  };

  const crearCita = async () => {
    if (!selectedSlot || !nombreValido || !emailValido) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          paciente_nombre: pacienteNombre.trim(),
          email: email.trim(),
          motivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCitaId(data.cita_id);
      setMonto(data.monto);
      setPaypalOrderId(data.paypal_order_id);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cita");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <SuccessTicket email={email} medico={selectedMedico} slot={selectedSlot} monto={monto} motivo={motivo} />;
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Stepper current={step} />

      {error && (
        <div
          role="alert"
          className="animate-pop mb-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.008M12 3l9 16H3l9-16z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div key={step} className="animate-step">
        {/* Step 1: Médico */}
        {step === 1 && (
          <section>
            <StepHeading title="Elige tu médico" subtitle="Selecciona el especialista para tu consulta" />
            {medicosLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-[76px] rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="stagger space-y-3">
                {medicos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectMedico(m)}
                    className="press group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-raised p-4 text-left hover:border-border-strong hover:bg-surface-hover"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-sm font-semibold uppercase text-text-muted ring-1 ring-inset ring-border-subtle">
                      {initials(m.nombre)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.nombre}</span>
                      <span className="block truncate text-sm text-text-muted">{m.especialidad}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-semibold tabular-nums text-accent">
                        ${Number(m.tarifa).toFixed(0)}
                      </span>
                      <svg
                        className="h-4 w-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step 2: Horario */}
        {step === 2 && selectedMedico && (
          <section>
            <BackButton onClick={() => setStep(1)}>Cambiar médico</BackButton>
            <StepHeading
              title="Elige fecha y hora"
              subtitle={`${selectedMedico.nombre} · ${selectedMedico.especialidad}`}
            />

            {loading ? (
              <div className="space-y-5">
                <div className="flex gap-2 overflow-hidden">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-16 w-16 shrink-0 rounded-xl" />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="skeleton h-11 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : fechasDisponibles.length === 0 ? (
              <EmptyState
                title="Sin horarios disponibles"
                subtitle="Este médico no tiene citas libres por ahora. Prueba con otro especialista."
              />
            ) : (
              <>
                <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2">
                  {fechasDisponibles.map((f) => {
                    const p = fechaParts(f);
                    const active = selectedFecha === f;
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          setSelectedFecha(f);
                          setSelectedSlot(null);
                        }}
                        aria-pressed={active}
                        className={`press flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border-subtle bg-surface-raised text-text-muted hover:border-border hover:text-text"
                        }`}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide">{p.weekday}</span>
                        <span className="text-lg font-semibold leading-tight tabular-nums text-text">{p.day}</span>
                        <span className="text-[10px] uppercase">{p.month}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedFecha ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slotsDelDia.map((s) => {
                      const active = selectedSlot?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          disabled={!s.disponible}
                          onClick={() => setSelectedSlot(s)}
                          aria-pressed={active}
                          className={`press rounded-xl border py-2.5 text-sm font-medium tabular-nums ${
                            !s.disponible
                              ? "cursor-not-allowed border-transparent bg-surface-overlay/40 text-text-subtle/50 line-through"
                              : active
                                ? "border-accent bg-accent text-white shadow-[0_0_0_3px_var(--color-accent-soft)]"
                                : "border-border-subtle bg-surface-raised text-text hover:border-border hover:bg-surface-hover"
                          }`}
                        >
                          {s.hora.slice(0, 5)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border-subtle py-6 text-center text-sm text-text-muted">
                    Selecciona un día para ver las horas disponibles
                  </p>
                )}

                {selectedSlot && (
                  <PrimaryButton className="mt-6" onClick={() => setStep(3)}>
                    Continuar
                  </PrimaryButton>
                )}
              </>
            )}
          </section>
        )}

        {/* Step 3: Datos */}
        {step === 3 && selectedMedico && selectedSlot && (
          <section>
            <BackButton onClick={() => setStep(2)}>Cambiar horario</BackButton>
            <StepHeading title="Tus datos" subtitle="Necesitamos estos datos para tu confirmación" />

            <SummaryCard medico={selectedMedico} slot={selectedSlot} monto={Number(selectedMedico.tarifa)} />

            <div className="mt-5 space-y-4">
              <Field label="Nombre completo" htmlFor="nombre">
                <input
                  id="nombre"
                  type="text"
                  autoComplete="name"
                  value={pacienteNombre}
                  onChange={(e) => setPacienteNombre(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft"
                  placeholder="Juan Pérez"
                />
              </Field>

              <Field
                label="Correo electrónico"
                htmlFor="email"
                error={emailTouched && email.length > 0 && !emailValido ? "Introduce un correo válido" : undefined}
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={emailTouched && !emailValido}
                  className={`w-full rounded-xl border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-subtle focus:ring-4 focus:ring-accent-soft ${
                    emailTouched && email.length > 0 && !emailValido
                      ? "border-danger/60 focus:border-danger"
                      : "border-border focus:border-accent"
                  }`}
                  placeholder="juan@email.com"
                />
              </Field>

              <Field label="Motivo de consulta" htmlFor="motivo" optional>
                <textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft"
                  placeholder="Describe brevemente el motivo..."
                />
                <span className="mt-1 block text-right text-[11px] tabular-nums text-text-subtle">
                  {motivo.length}/500
                </span>
              </Field>
            </div>

            <PrimaryButton
              className="mt-6"
              onClick={crearCita}
              disabled={loading || !nombreValido || !emailValido}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Preparando pago...
                </span>
              ) : (
                "Ir al pago"
              )}
            </PrimaryButton>
          </section>
        )}

        {/* Step 4: Pago */}
        {step === 4 && citaId && paypalOrderId && selectedMedico && selectedSlot && (
          <section>
            <StepHeading title="Confirma y paga" subtitle="Pago seguro procesado por PayPal" />

            <SummaryCard medico={selectedMedico} slot={selectedSlot} monto={monto} highlightTotal />

            <div className="mt-5">
              <PayPalScriptProvider
                options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
                  currency: "USD",
                  intent: "capture",
                }}
              >
                <PayPalButtons
                  style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal" }}
                  createOrder={() => Promise.resolve(paypalOrderId)}
                  onApprove={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/paypal/capture", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: paypalOrderId }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      setSuccess(true);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Error en el pago");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError("Error con PayPal. Intenta de nuevo.")}
                />
              </PayPalScriptProvider>

              {loading && (
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-text-muted">
                  <Spinner /> Procesando pago...
                </p>
              )}

              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-text-subtle">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Tus datos están protegidos y encriptados
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* --------------------------------------------------------------------------- */

function Stepper({ current }: { current: Step }) {
  const fill = ((current - 1) / (STEPS.length - 1)) * 75;
  return (
    <div className="relative mb-8">
      <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-4 h-0.5 -translate-y-1/2 rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <ol className="relative flex justify-between">
        {STEPS.map((label, i) => {
          const num = (i + 1) as Step;
          const done = current > num;
          const active = current === num;
          return (
            <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                  done
                    ? "border-accent bg-accent text-white"
                    : active
                      ? "border-accent bg-surface text-accent shadow-[0_0_0_4px_var(--color-accent-soft)]"
                      : "border-border-subtle bg-surface-overlay text-text-subtle"
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </span>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-text" : done ? "text-text-muted" : "text-text-subtle"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  className = "",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`press w-full rounded-xl bg-accent py-3.5 font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-sm text-text-muted">
        <span>{label}</span>
        {optional && <span className="text-[11px] text-text-subtle">Opcional</span>}
      </label>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  );
}

function SummaryCard({
  medico,
  slot,
  monto,
  highlightTotal,
}: {
  medico: Medico;
  slot: Slot;
  monto: number;
  highlightTotal?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold uppercase text-text-muted ring-1 ring-inset ring-border-subtle">
          {initials(medico.nombre)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{medico.nombre}</p>
          <p className="truncate text-xs text-text-muted">{medico.especialidad}</p>
        </div>
      </div>
      <dl className="divide-y divide-border-subtle text-sm">
        <Row label="Fecha" value={formatFecha(slot.fecha)} />
        <Row label="Hora" value={slot.hora.slice(0, 5)} />
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-text-muted">Total</dt>
          <dd
            className={`font-semibold tabular-nums ${
              highlightTotal ? "text-base text-accent" : "text-text"
            }`}
          >
            ${monto.toFixed(2)} USD
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-overlay text-text-subtle">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">{subtitle}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

function SuccessTicket({
  email,
  medico,
  slot,
  monto,
  motivo,
}: {
  email: string;
  medico: Medico | null;
  slot: Slot | null;
  monto: number;
  motivo: string;
}) {
  return (
    <div className="animate-pop mx-auto flex w-full max-w-sm flex-col items-center py-10 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-8 ring-success/5">
        <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">¡Cita confirmada!</h2>
      <p className="mt-2 text-sm text-text-muted">
        Enviamos los detalles a <span className="font-medium text-text">{email}</span>
      </p>

      {medico && slot && (
        <div className="mt-7 w-full overflow-hidden rounded-2xl border border-border bg-surface-raised text-left">
          <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold uppercase text-text-muted ring-1 ring-inset ring-border-subtle">
              {initials(medico.nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{medico.nombre}</p>
              <p className="truncate text-xs text-text-muted">{medico.especialidad}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              Pagada
            </span>
          </div>
          <dl className="divide-y divide-border-subtle text-sm">
            <Row label="Fecha" value={formatFechaLarga(slot.fecha)} />
            <Row label="Hora" value={slot.hora.slice(0, 5)} />
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-text-muted">Monto</dt>
              <dd className="font-semibold tabular-nums text-accent">${Number(monto).toFixed(2)} USD</dd>
            </div>
            {motivo && (
              <div className="px-4 py-3">
                <dt className="mb-1 text-text-muted">Motivo</dt>
                <dd className="text-text-muted">{motivo}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
