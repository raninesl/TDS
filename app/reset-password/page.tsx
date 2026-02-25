"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/clients";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const update = async () => {
    setLoading(true);
    setMsg("");

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMsg("Session introuvable. Ouvre le lien reçu par email à nouveau.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("Mot de passe mis à jour ✅");
      router.replace("/account");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Nouveau mot de passe</h1>

      <input
        className="w-full border rounded px-3 py-2"
        type="password"
        placeholder="Nouveau mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className={`btn w-full ${loading ? "opacity-60" : ""}`} disabled={loading} onClick={update}>
        Mettre à jour
      </button>

      {msg && (
        <p className={`text-sm ${msg.includes("✅") ? "text-green-700" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
