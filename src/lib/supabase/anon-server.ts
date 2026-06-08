import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anon para lecturas públicas (respeta RLS).
 * Usar en rutas GET que no requieren service_role.
 */
export function createAnonServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
