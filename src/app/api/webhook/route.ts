import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { confirmarCita } from "@/lib/citas";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalWebhookSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const isValid = await verifyPayPalWebhook(request.headers, body);
  if (!isValid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const parsed = paypalWebhookSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const event = parsed.data;

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return NextResponse.json({ received: true });
  }

  try {
    const captureId = event.resource?.id;
    let citaId = event.resource?.custom_id;
    const supabase = createAdminClient();

    if (!citaId) {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;

      if (captureId) {
        const { data } = await supabase
          .from("citas")
          .select("id")
          .eq("paypal_capture_id", captureId)
          .maybeSingle();
        citaId = data?.id;
      }

      if (!citaId && orderId) {
        const { data } = await supabase
          .from("citas")
          .select("id")
          .eq("paypal_order_id", orderId)
          .maybeSingle();
        citaId = data?.id;
      }
    }

    if (!citaId) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    await confirmarCita(citaId, captureId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
