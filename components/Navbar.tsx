"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/clients";
import { useCart } from "@/components/cart/CartContext";

type Profile = { is_admin: boolean };

export default function Navbar() {
  const { count } = useCart();

  const [mounted, setMounted] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);
}, []);

  const fetchRole = async () => {
    setLoadingRole(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;

    if (!uid) {
      setIsAdmin(false);
      setLoadingRole(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", uid)
      .maybeSingle();

    if (!error && (data as Profile | null)?.is_admin) setIsAdmin(true);
    else setIsAdmin(false);

    setLoadingRole(false);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!cancelled) await fetchRole();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) void fetchRole();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="w-full px-3 md:px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/tds-logo.png"
            alt="TDS"
            className="w-20 h-20 md:w-24 md:h-24 object-contain"
          />
          <span
            className="font-semibold text-xl md:text-2xl tracking-tight"
            style={{ color: "var(--title-color)" }}
          >
            TDS — Tissage de Soleil
          </span>
        </Link>

        <nav className="flex gap-6 text-sm items-center">
          <Link href="/#about" className="hover:opacity-80">Accueil</Link>
          <Link href="/shop" className="hover:opacity-80">Boutique</Link>

          {!isAdmin && (
            <>
              <Link href="/cart" className="relative hover:opacity-80">
                Panier
                {mounted && count > 0 && (
                  <span className="badge ml-2">{count}</span>
                )}
              </Link>

              <Link href="/orders" className="hover:opacity-80">Mes commandes</Link>
            </>
          )}

          <Link href="/account" className="btn btn-ghost">Compte</Link>

          {!loadingRole && isAdmin && <Link href="/admin" className="btn">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}
