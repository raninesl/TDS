"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";

export default function PaymentSuccessPage() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id");
  const { clear } = useCart();

useEffect(() => {
  // vider le panier UNE seule fois
  clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Paiement réussi ✅</h1>
      <p className="text-gray-700">Merci ! Ton paiement est en cours de confirmation.</p>

      {sessionId && (
        <p className="text-sm text-gray-600">
          Session : <span className="font-mono">{sessionId}</span>
        </p>
      )}

      <Link className="btn" href="/orders">
        Voir mes commandes
      </Link>
    </div>
  );
}
