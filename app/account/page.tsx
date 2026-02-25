"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/clients";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup" | "forgot";

export default function AccountPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  useEffect(() => {
    // Charger cooldown éventuel (anti-spam reset password)
    const ts = Number(localStorage.getItem("tds_reset_pw_cooldown") || "0");
    if (ts && ts > Date.now()) setCooldownUntil(ts);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    const diff = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    return diff;
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(null);
        localStorage.removeItem("tds_reset_pw_cooldown");
      } else {
        // trigger re-render
        setCooldownUntil((v) => (v ? v : null));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionEmail(data.session?.user?.email ?? null);
      const uid = data.session?.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .maybeSingle();
        setIsAdmin(Boolean((profile as { is_admin?: boolean } | null)?.is_admin));
      } else {
        setIsAdmin(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // If already connected
  if (sessionEmail) {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Mon compte</h1>
        <p className="text-gray-700">
          Connecté(e) : <span className="font-medium">{sessionEmail}</span>
        </p>

        {isAdmin === false && <ProfileForm />}

        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => router.push("/")}>
            Accueil
          </button>

          <button
            className="btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setMsg("");
              const { error } = await supabase.auth.signOut();
              if (error) setMsg(error.message);
              setLoading(false);
            }}
          >
            Se déconnecter
          </button>
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    );
  }

  const submit = async () => {
    setLoading(true);
    setMsg("");

    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Nom requis.");
        if (!email.trim()) throw new Error("Email requis.");
        if (!password.trim()) throw new Error("Mot de passe requis.");
        if (!phone.trim()) throw new Error("Téléphone requis.");
        if (!address.trim()) throw new Error("Adresse requise.");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              address: address.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;

        setMsg("Compte créé ✅ Vérifie ton email pour activer le compte.");
        return;
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMsg("Connexion réussie ✅");
        router.push("/");
        return;
      }

      if (mode === "forgot") {
        if (!email.trim()) throw new Error("Email requis.");
        if (cooldownUntil && Date.now() < cooldownUntil) {
          throw new Error("Trop de demandes. Réessaie dans quelques instants.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;

        setMsg("Email envoyé ✅ Vérifie ta boîte mail pour réinitialiser ton mot de passe.");
        // Mettre un cooldown anti-spam (60s)
        const next = Date.now() + 60_000;
        setCooldownUntil(next);
        localStorage.setItem("tds_reset_pw_cooldown", String(next));
        return;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur.";
      if (message.toLowerCase().includes("rate") || message.includes("429")) {
        // Appliquer un cooldown si on reçoit un 429 / rate limit
        const next = Date.now() + 60_000;
        setCooldownUntil(next);
        localStorage.setItem("tds_reset_pw_cooldown", String(next));
        setMsg("Trop de demandes. Réessaie dans 1 minute.");
      } else {
        setMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">
        {mode === "signup"
          ? "Créer un compte"
          : mode === "forgot"
          ? "Mot de passe oublié"
          : "Se connecter"}
      </h1>

      <div className="flex gap-2">
        <button
          className={`btn ${mode === "login" ? "btn-primary" : ""}`}
          onClick={() => setMode("login")}
          type="button"
        >
          Connexion
        </button>
        <button
          className={`btn ${mode === "signup" ? "btn-primary" : ""}`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Inscription
        </button>
        <button
          className={`btn ${mode === "forgot" ? "btn-primary" : ""}`}
          onClick={() => setMode("forgot")}
          type="button"
        >
          MDP oublié
        </button>
      </div>

      {mode === "signup" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Nom complet</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Lina Slimane"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Téléphone</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 ..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Adresse de livraison</label>
            <textarea
              className="textarea"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rue, Ville, Code postal, Pays"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm">Email</label>
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="exemple@email.com"
        />
      </div>

      {mode !== "forgot" && (
        <div className="space-y-2">
          <label className="text-sm">Mot de passe</label>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
          />
        </div>
      )}

      <button
        className={`btn btn-primary w-full ${loading || secondsLeft > 0 ? "opacity-60" : ""}`}
        disabled={loading || secondsLeft > 0}
        onClick={submit}
        type="button"
      >
        {loading
          ? "..."
          : mode === "signup"
          ? "Créer le compte"
          : mode === "forgot"
          ? secondsLeft > 0
            ? `Attendre ${secondsLeft}s`
            : "Envoyer email"
          : "Se connecter"}
      </button>

      {msg && (
        <p className={`text-sm ${msg.includes("✅") ? "text-green-700" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

function ProfileForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.from("profiles").select("full_name,phone,address").eq("id", uid).maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          setName((data as { full_name?: string })?.full_name ?? "");
          setPhone((data as { phone?: string })?.phone ?? "");
          setAddress((data as { address?: string })?.address ?? "");
        }
        const { data: userData } = await supabase.auth.getUser();
        const meta = userData.user?.user_metadata as
          | { postal_code?: string; city?: string; country?: string; full_name?: string; phone?: string; address?: string }
          | undefined;
        if (meta) {
          setPostalCode(meta.postal_code ?? "");
          setCity(meta.city ?? "");
          setCountry(meta.country ?? "");
          if (!((data as { full_name?: string } | null)?.full_name) && meta.full_name) setName(meta.full_name);
          if (!((data as { phone?: string } | null)?.phone) && meta.phone) setPhone(meta.phone);
          if (!((data as { address?: string } | null)?.address) && meta.address) setAddress(meta.address);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setMsg("Non connecté.");
        return;
      }
      const payload = { id: uid, full_name: name.trim(), phone: phone.trim(), address: address.trim() };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          address: payload.address,
          postal_code: postalCode.trim(),
          city: city.trim(),
          country: country.trim(),
        },
      });
      setMsg("✅ Informations mises à jour");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Erreur mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-3">
      <p className="font-medium">Informations de livraison</p>
      {loading ? (
        <p className="text-gray-600">Chargement…</p>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm">Nom complet</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Téléphone</label>
            <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Adresse</label>
            <textarea className="textarea w-full" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm">Code postal</label>
              <input className="input w-full" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Ville</label>
              <input className="input w-full" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Pays</label>
              <input className="input w-full" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <button className={`btn btn-primary ${saving ? "opacity-60" : ""}`} disabled={saving} onClick={save} type="button">
            Enregistrer
          </button>
          {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>{msg}</p>}
        </>
      )}
    </div>
  );
}
