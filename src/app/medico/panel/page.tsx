import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import CitasPanel, { type PanelCita } from "@/components/CitasPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MedicoPanelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/medico/login");

  const { data: medico } = await supabase
    .from("medicos")
    .select("id, nombre, especialidad")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!medico) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Cuenta no vinculada</h1>
          <p className="mt-2 text-sm text-text-muted">
            Tu usuario no está asociado a ningún médico. Contacta al administrador.
          </p>
          <LogoutButton className="mt-6" />
        </div>
      </main>
    );
  }

  const { data: citasRaw } = await supabase
    .from("citas")
    .select(
      `
      id, paciente_nombre, email, motivo, monto, estado,
      slot:slots!inner ( fecha, hora, medico_id )
    `
    )
    .in("estado", ["confirmada", "cancelada", "expirada"])
    .eq("slot.medico_id", medico.id)
    .order("created_at", { ascending: false });

  const citas: PanelCita[] = (citasRaw ?? []).map((cita) => {
    const slotRaw = cita.slot as
      | { fecha: string; hora: string }
      | { fecha: string; hora: string }[];
    const slot = Array.isArray(slotRaw) ? slotRaw[0] : slotRaw;
    return {
      id: cita.id,
      paciente_nombre: cita.paciente_nombre,
      email: cita.email,
      motivo: cita.motivo,
      monto: Number(cita.monto),
      estado: cita.estado as PanelCita["estado"],
      fecha: slot.fecha,
      hora: slot.hora,
    };
  });

  const inicial = medico.nombre.replace(/^(Dr|Dra)\.?\s+/i, "").trim()[0] ?? "M";
  const confirmadasCount = citas.filter((c) => c.estado === "confirmada").length;
  const total = citas
    .filter((c) => c.estado === "confirmada")
    .reduce((sum, c) => sum + c.monto, 0);

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold uppercase text-accent ring-1 ring-inset ring-accent/20">
              {inicial}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight">{medico.nombre}</h1>
              <p className="truncate text-xs text-text-muted">{medico.especialidad}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-text-muted transition-colors hover:text-text">
              Inicio
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="animate-fade mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Stat tiles */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">Citas confirmadas</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{confirmadasCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">Ingresos</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-accent">${total.toFixed(0)}</p>
          </div>
        </div>

        <CitasPanel citas={citas} />
      </section>
    </main>
  );
}
