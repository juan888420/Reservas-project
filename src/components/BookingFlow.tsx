"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { Medico, Slot } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

const STEPS = ["Médico", "Horario", "Datos", "Pago"] as const;

export default function BookingFlow() {
  const [step, setStep] = useState<Step>(1);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");

  const [citaId, setCitaId] = useState<string | null>(null);
  const [monto, setMonto] = useState<number>(0);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medicos")
      .then((r) => r.json())
      .then(setMedicos)
      .catch(() => setError("No se pudieron cargar los médicos"));
  }, []);

  const loadSlots = useCallback(async (medicoId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slots?medico_id=${medicoId}`);
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

  const selectMedico = (medico: Medico) => {
    setSelectedMedico(medico);
    setSelectedFecha(null);
    setSelectedSlot(null);
    loadSlots(medico.id);
    setStep(2);
    setError(null);
  };

  const crearCita = async () => {
    if (!selectedSlot || !pacienteNombre || !email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          paciente_nombre: pacienteNombre,
          email,
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

  const formatFecha = (fecha: string) =>
    new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">¡Cita confirmada!</h2>
        <p className="mt-2 max-w-sm text-text-muted">
          Recibirás un correo de confirmación en <span className="text-text">{email}</span> con los detalles y un enlace para Google Calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((label, i) => {
          const num = (i + 1) as Step;
          const active = step === num;
          const done = step > num;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : done
                      ? "bg-accent/20 text-accent"
                      : "bg-surface-overlay text-text-muted"
                }`}
              >
                {done ? "✓" : num}
              </div>
              <span className={`text-[10px] ${active ? "text-text" : "text-text-muted"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Step 1: Médico */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="mb-4 text-lg font-semibold">Elige tu médico</h2>
          {medicos.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMedico(m)}
              className="group w-full rounded-xl border border-border bg-surface-raised p-4 text-left transition-all hover:border-accent/50 hover:bg-surface-overlay"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.nombre}</p>
                  <p className="text-sm text-text-muted">{m.especialidad}</p>
                </div>
                <span className="rounded-lg bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                  ${Number(m.tarifa).toFixed(0)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Horario */}
      {step === 2 && selectedMedico && (
        <div>
          <button onClick={() => setStep(1)} className="mb-4 text-sm text-text-muted hover:text-text">
            ← Cambiar médico
          </button>
          <h2 className="mb-1 text-lg font-semibold">Elige fecha y hora</h2>
          <p className="mb-4 text-sm text-text-muted">
            {selectedMedico.nombre} · {selectedMedico.especialidad}
          </p>

          {loading ? (
            <p className="text-text-muted">Cargando horarios...</p>
          ) : (
            <>
              <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                {fechasDisponibles.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setSelectedFecha(f);
                      setSelectedSlot(null);
                    }}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      selectedFecha === f
                        ? "bg-accent text-white"
                        : "bg-surface-overlay text-text-muted hover:text-text"
                    }`}
                  >
                    {formatFecha(f)}
                  </button>
                ))}
              </div>

              {selectedFecha && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slotsDelDia.map((s) => (
                    <button
                      key={s.id}
                      disabled={!s.disponible}
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        !s.disponible
                          ? "cursor-not-allowed bg-surface-overlay/50 text-text-muted/40 line-through"
                          : selectedSlot?.id === s.id
                            ? "bg-accent text-white"
                            : "bg-surface-overlay text-text hover:bg-accent/20"
                      }`}
                    >
                      {s.hora.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}

              {selectedSlot && (
                <button
                  onClick={() => setStep(3)}
                  className="mt-6 w-full rounded-xl bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Continuar
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: Datos */}
      {step === 3 && selectedMedico && selectedSlot && (
        <div>
          <button onClick={() => setStep(2)} className="mb-4 text-sm text-text-muted hover:text-text">
            ← Cambiar horario
          </button>
          <h2 className="mb-4 text-lg font-semibold">Tus datos</h2>

          <div className="mb-4 rounded-xl border border-border-subtle bg-surface-raised p-4 text-sm">
            <p className="text-text-muted">
              {selectedMedico.nombre} · {formatFecha(selectedSlot.fecha)} · {selectedSlot.hora.slice(0, 5)}
            </p>
            <p className="mt-1 font-semibold text-accent">${Number(selectedMedico.tarifa).toFixed(2)} USD</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Nombre completo</label>
              <input
                type="text"
                value={pacienteNombre}
                onChange={(e) => setPacienteNombre(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                placeholder="juan@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Motivo de consulta</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                placeholder="Describe brevemente el motivo..."
              />
            </div>
          </div>

          <button
            onClick={crearCita}
            disabled={loading || !pacienteNombre || !email}
            className="mt-6 w-full rounded-xl bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Preparando pago..." : "Ir al pago"}
          </button>
        </div>
      )}

      {/* Step 4: Pago */}
      {step === 4 && citaId && paypalOrderId && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Pago con PayPal</h2>
          <p className="mb-6 text-sm text-text-muted">
            Total: <span className="font-semibold text-accent">${monto.toFixed(2)} USD</span>
          </p>

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
            <p className="mt-4 text-center text-sm text-text-muted">Procesando pago...</p>
          )}
        </div>
      )}
    </div>
  );
}
