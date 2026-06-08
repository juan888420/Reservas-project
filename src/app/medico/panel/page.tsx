import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
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

  const { data: citas } = await supabase
    .from("citas")
    .select(
      `
      id, paciente_nombre, email, motivo, monto, estado, created_at,
      slot:slots!inner ( fecha, hora, medico_id )
    `
    )
    .eq("estado", "confirmada")
    .eq("slot.medico_id", medico.id)
    .order("created_at", { ascending: false });

  const formatFecha = (fecha: string) =>
    new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="min-h-dvh">
      <header className="border-b border-border-subtle px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{medico.nombre}</h1>
            <p className="text-xs text-text-muted">{medico.especialidad}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-text-muted hover:text-text">
              Inicio
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-text-muted">
          Citas confirmadas ({citas?.length ?? 0})
        </h2>

        {!citas?.length ? (
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-8 text-center">
            <p className="text-text-muted">No hay citas confirmadas aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {citas.map((cita) => {
              const slotRaw = cita.slot as
                | { fecha: string; hora: string }
                | { fecha: string; hora: string }[];
              const slot = Array.isArray(slotRaw) ? slotRaw[0] : slotRaw;
              return (
                <div
                  key={cita.id}
                  className="rounded-xl border border-border bg-surface-raised p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{cita.paciente_nombre}</p>
                      <p className="text-sm text-text-muted">{cita.email}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      Confirmada
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                    <span>{formatFecha(slot.fecha)}</span>
                    <span>{slot.hora.slice(0, 5)}</span>
                    <span>${Number(cita.monto).toFixed(2)}</span>
                  </div>
                  {cita.motivo && (
                    <p className="mt-3 rounded-lg bg-surface-overlay px-3 py-2 text-sm text-text-muted">
                      <span className="text-text">Motivo:</span> {cita.motivo}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
