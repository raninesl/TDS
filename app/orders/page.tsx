"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/clients";

type Order = {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMsg("Connecte-toi pour voir tes commandes.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id,status,total_cents,currency,created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setMsg(error.message);
        setOrders([]);
      } else {
        setOrders((data ?? []) as Order[]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mes commandes</h1>

      {loading && <p className="text-gray-600">Chargement...</p>}

      {msg && (
        <p className={msg.includes("Connecte-toi") ? "text-gray-700" : "text-red-600"}>
          {msg}
        </p>
      )}

      {!loading && !msg && orders.length === 0 && (
        <p className="text-gray-600">Aucune commande pour le moment.</p>
      )}

      {!loading && !msg && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Commande <span className="font-mono">{o.id.slice(0, 8)}...</span>
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(o.created_at).toLocaleString("fr-FR")} — Statut: {o.status}
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  {(o.total_cents / 100).toFixed(2)} {o.currency}
                </p>
                <Link className="btn btn-ghost text-sm" href={`/orders/${o.id}`}>
                  Voir détails
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
