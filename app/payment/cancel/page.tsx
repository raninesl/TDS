"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentCancelPage() {
  const sp = useSearchParams();
  const orderId = sp.get("order_id");

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Paiement annulé</h1>
      {orderId && (
        <p className="text-sm text-gray-600">
          Commande : <span className="font-mono">{orderId}</span>
        </p>
      )}
      <Link className="btn" href="/cart">
        Retour au panier
      </Link>
    </div>
  );
}
