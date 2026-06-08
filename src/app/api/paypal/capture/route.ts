import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { confirmarCita } from "@/lib/citas";

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

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
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
