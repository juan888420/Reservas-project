"use client";

import { useMemo, useState } from "react";

export type PanelCita = {
  id: string;
  paciente_nombre: string;
  email: string;
  motivo: string | null;
  monto: number;
  estado: "confirmada" | "cancelada" | "expirada";
  fecha: string;
  hora: string;
};

type Filtro = "confirmadas" | "completadas" | "canceladas";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "confirmadas", label: "Confirmadas" },
  { id: "completadas", label: "Completadas" },
  { id: "canceladas", label: "Canceladas" },
];

const EMPTY_COPY: Record<Filtro, { title: string; subtitle: string }> = {
  confirmadas: {
    title: "Sin próximas citas",
    subtitle: "Las nuevas reservas confirmadas aparecerán aquí.",
  },
  completadas: {
    title: "Sin citas completadas",
    subtitle: "Las consultas ya realizadas aparecerán aquí.",
  },
  canceladas: {
    title: "Sin citas canceladas",
    subtitle: "Las citas canceladas o expiradas aparecerán aquí.",
  },
};

function esPasada(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}`) < new Date();
}

function categoria(cita: PanelCita): Filtro {
  if (cita.estado === "confirmada") {
    return esPasada(cita.fecha, cita.hora) ? "completadas" : "confirmadas";
  }
  return "canceladas";
}

function formatFecha(fecha: string) {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Badge({ cita }: { cita: PanelCita }) {
  if (cita.estado === "confirmada") {
    const completada = esPasada(cita.fecha, cita.hora);
    return (
      <span
        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
          completada ? "bg-surface-overlay text-text-muted" : "bg-success/10 text-success"
        }`}
      >
        {completada ? "Completada" : "Confirmada"}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-lg bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
      {cita.estado === "expirada" ? "Expirada" : "Cancelada"}
    </span>
  );
}

export default function CitasPanel({ citas }: { citas: PanelCita[] }) {
  const [filtro, setFiltro] = useState<Filtro>("confirmadas");

  const counts = useMemo(() => {
    const c: Record<Filtro, number> = { confirmadas: 0, completadas: 0, canceladas: 0 };
    for (const cita of citas) c[categoria(cita)]++;
    return c;
  }, [citas]);

  const visibles = useMemo(
    () => citas.filter((c) => categoria(c) === filtro),
    [citas, filtro]
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrar citas"
        className="mb-6 flex gap-1 rounded-xl border border-border bg-surface-raised p-1"
      >
        {FILTROS.map((f) => {
          const active = filtro === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => setFiltro(f.id)}
              className={`press flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  active ? "bg-white/20" : "bg-surface-overlay text-text-subtle"
                }`}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <div className="animate-fade rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-overlay text-text-subtle">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium">{EMPTY_COPY[filtro].title}</p>
          <p className="mt-1 text-sm text-text-muted">{EMPTY_COPY[filtro].subtitle}</p>
        </div>
      ) : (
        <div key={filtro} className="stagger space-y-3">
          {visibles.map((cita) => (
            <div
              key={cita.id}
              className="rounded-2xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{cita.paciente_nombre}</p>
                  <p className="truncate text-sm text-text-muted">{cita.email}</p>
                </div>
                <Badge cita={cita} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatFecha(cita.fecha)}
                </span>
                <span className="tabular-nums">{cita.hora.slice(0, 5)}</span>
                <span className="ml-auto font-medium tabular-nums text-text">
                  ${Number(cita.monto).toFixed(2)}
                </span>
              </div>
              {cita.motivo && (
                <p className="mt-3 rounded-lg bg-surface-overlay px-3 py-2 text-sm text-text-muted">
                  <span className="text-text">Motivo:</span> {cita.motivo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
