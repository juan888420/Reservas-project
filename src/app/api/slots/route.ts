import { NextRequest, NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/anon-server";

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

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
