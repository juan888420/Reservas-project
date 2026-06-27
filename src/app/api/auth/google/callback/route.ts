import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { googleCallbackSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const parsed = googleCallbackSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { code } = parsed.data;

  try {
    const tokens = await getTokensFromCode(code);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/medico/login", request.nextUrl.origin));
    }

    const { data: medico } = await supabase
      .from("medicos")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!medico) {
      return NextResponse.redirect(new URL("/medico/panel", request.nextUrl.origin));
    }

    // Guardar integración con Google Calendar
    const { error: insertError } = await supabase
      .from("google_calendar_integrations")
      .upsert({
        medico_id: medico.id,
        google_user_id: tokens.scope || "",
        access_token: tokens.access_token || "",
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      });

    if (insertError) {
      console.error("Error saving Google Calendar integration:", insertError);
      return NextResponse.redirect(
        new URL(`/medico/panel?error=integration_failed`, request.nextUrl.origin)
      );
    }

    return NextResponse.redirect(new URL("/medico/panel?success=google_connected", request.nextUrl.origin));
  } catch (error) {
    console.error("Error during Google Calendar callback:", error);
    return NextResponse.redirect(
      new URL(`/medico/panel?error=callback_failed`, request.nextUrl.origin)
    );
  }
}
