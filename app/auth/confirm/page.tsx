"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/clients";

export default function ConfirmPage() {
  const [msg, setMsg] = useState("Validation en cours...");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE: échanger le code contre une session (activation)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        setMsg("Compte activé ✅ Tu peux maintenant te connecter.");
      } catch (err: unknown) {
        setMsg(err instanceof Error ? err.message : "Erreur activation compte.");
      }
    })();
  }, []);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Activation</h1>
      <p className="text-gray-700">{msg}</p>

      <Link className="btn" href="/account">
        Aller à la connexion
      </Link>
    </div>
  );
}
