import { NextRequest, NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { createAdminClient } from "@/lib/supabase/admin";

const DIAS_A_GENERAR = 90;
const HORAS = Array.from({ length: 8 }, (_, i) => `${i + 9}:00`);

function generarFechas(desde: string, dias: number): string[] {
  const fechas: string[] = [];
  const start = new Date(desde + "T12:00:00");
  for (let i = 0; i < dias; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      fechas.push(d.toISOString().split("T")[0]);
    }
  }
  return fechas;
}

async function generarSlots(medicoId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: medicos } = await supabase
    .from("medicos")
    .select("id")
    .eq("id", medicoId);

  if (!medicos?.length) return;

  const hoy = new Date().toISOString().split("T")[0];
  const fechas = generarFechas(hoy, DIAS_A_GENERAR);

  const rows = fechas.flatMap((fecha) =>
    HORAS.map((hora) => ({
      medico_id: medicoId,
      fecha,
      hora,
    }))
  );

  await supabase.from("slots").upsert(rows, {
    onConflict: "medico_id, fecha, hora",
    ignoreDuplicates: true,
  });
}

export async function GET(request: NextRequest) {
  const medicoId = request.nextUrl.searchParams.get("medico_id");
  const fecha = request.nextUrl.searchParams.get("fecha");
  const soloDisponibles = request.nextUrl.searchParams.get("disponibles") === "true";

  if (!medicoId) {
    return NextResponse.json({ error: "medico_id requerido" }, { status: 400 });
  }

  const supabase = createAnonServerClient();
  let query = supabase
    .from("slots")
    .select("id, medico_id, fecha, hora, disponible")
    .eq("medico_id", medicoId)
    .gte("fecha", new Date().toISOString().split("T")[0])
    .order("fecha")
    .order("hora");

  if (fecha) {
    query = query.eq("fecha", fecha);
  }

  if (soloDisponibles) {
    query = query.eq("disponible", true);
  }

  let { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    await generarSlots(medicoId);

    const retry = supabase
      .from("slots")
      .select("id, medico_id, fecha, hora, disponible")
      .eq("medico_id", medicoId)
      .gte("fecha", new Date().toISOString().split("T")[0])
      .order("fecha")
      .order("hora");

    if (fecha) retry.eq("fecha", fecha);
    if (soloDisponibles) retry.eq("disponible", true);

    const { data: retryData, error: retryError } = await retry;
    if (retryError) {
      return NextResponse.json({ error: retryError.message }, { status: 500 });
    }
    data = retryData;
  }

  return NextResponse.json(data);
}
