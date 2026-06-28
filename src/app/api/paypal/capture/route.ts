import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { capturePayPalOrder } from "@/lib/paypal";
import { confirmarCita } from "@/lib/citas";
import { paypalCaptureSchema } from "@/lib/schemas";
import { captureRatelimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { success } = await captureRatelimit.limit(getClientIp(request));
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 }
    );
  }

  try {
    const { orderId } = paypalCaptureSchema.parse(await request.json());

    const capture = await capturePayPalOrder(orderId);
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const citaId =
      capture.purchase_units?.[0]?.reference_id ||
      capture.purchase_units?.[0]?.custom_id;

    if (!citaId) {
      return NextResponse.json({ error: "Cita no identificada" }, { status: 400 });
    }

    await confirmarCita(citaId, captureId);

    return NextResponse.json({ success: true, cita_id: citaId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/paypal/capture]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
