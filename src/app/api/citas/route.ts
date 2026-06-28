import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayPalOrder } from "@/lib/paypal";
import { citaSchema } from "@/lib/schemas";
import { citasRatelimit, getClientIp } from "@/lib/rate-limit";

type CrearCitaResult = {
  cita_id?: string;
  monto?: number;
  error?: string;
};

export async function POST(request: NextRequest) {
  const { success } = await citasRatelimit.limit(getClientIp(request));
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 }
    );
  }

  try {
    const body = citaSchema.parse(await request.json());
    const { slot_id, paciente_nombre, email, motivo } = body;

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("crear_cita_pendiente", {
      p_slot_id: slot_id,
      p_paciente_nombre: paciente_nombre,
      p_email: email,
      p_motivo: motivo || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as CrearCitaResult;

    if (result.error) {
      const status = result.error === "slot_no_disponible" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    if (!result.cita_id || result.monto == null) {
      return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 });
    }

    const paypalOrder = await createPayPalOrder(result.monto, result.cita_id);

    await supabase.rpc("actualizar_paypal_order_id", {
      p_cita_id: result.cita_id,
      p_order_id: paypalOrder.id,
    });

    return NextResponse.json({
      cita_id: result.cita_id,
      monto: result.monto,
      paypal_order_id: paypalOrder.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/citas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
