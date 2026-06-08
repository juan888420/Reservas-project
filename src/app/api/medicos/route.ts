import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/anon-server";

export async function GET() {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("medicos")
    .select("id, nombre, especialidad, tarifa")
    .order("nombre");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
