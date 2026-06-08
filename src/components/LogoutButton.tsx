"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/medico/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-danger/50 hover:text-danger"
      }
    >
      Cerrar sesión
    </button>
  );
}
