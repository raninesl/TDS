"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/clients";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Validation en cours...");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Supabase envoie souvent un "code" (PKCE). On l’échange contre une session.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Si c’est un reset password, Supabase redirige parfois vers /reset-password,
        // mais on force un chemin simple :
        router.replace("/reset-password");
      } catch (err: unknown) {
        setMsg(err instanceof Error ? err.message : "Erreur callback.");
      }
    })();
  }, [router]);

  return <p className="text-gray-700">{msg}</p>;
}