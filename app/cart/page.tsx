"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
// import Image from "next/image";

import { useCart } from "@/components/cart/CartContext";
import { startStripeCheckout } from "@/lib/stripeCheckout";
import { apiGet } from "@/lib/api";

type ProductMeta = {
  slug: string;
  images: string[] | null;
  category: string | null;
};

type FullProductResponse = {
  product: {
    images?: string[] | null;
    category: string | null;
  };
  images: Array<{ url: string; sort_order: number; color: string | null }>;
};

export default function CartPage() {
  const router = useRouter();
  const { items, totalCents, removeItem, setQty, clear } = useCart();

  const [creating, setCreating] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [metaBySlug, setMetaBySlug] = useState<Record<string, ProductMeta>>({});
  const [loadingMeta, setLoadingMeta] = useState(false);

  const currency = items[0]?.currency ?? "EUR";

  // Charger les vignettes produit (images[0]) pour chaque slug présent dans le panier
  useEffect(() => {
    const slugs = Array.from(new Set(items.map((it) => it.slug)));
    if (slugs.length === 0) return;
    let cancelled = false;

    (async () => {
      setLoadingMeta(true);
      try {
        const entries = await Promise.all(
          slugs.map(async (slug) => {
            try {
              const full = await apiGet<FullProductResponse>(`/products/${slug}/full`);
              const fromImagesTable =
                (full.images ?? [])
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((im) => im.url)[0] ?? null;
              const fallback = full.product.images?.[0] ?? null;
              const first = fromImagesTable || fallback;
              return [
                slug,
                { slug, images: first ? [first] : [], category: full.product.category },
              ] as const;
            } catch {
              return [slug, { slug, images: [], category: null }] as const;
            }
          })
        );
        if (!cancelled) {
          const rec: Record<string, ProductMeta> = {};
          for (const [slug, meta] of entries) rec[slug] = meta;
          setMetaBySlug(rec);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const lineTotals = useMemo(
    () =>
      items.map((it) => ({
        id: it.productId,
        total: it.priceCents * it.quantity,
      })),
    [items]
  );

  const handleCheckout = async () => {
    if (creating) return;

    setCreating(true);
    setOrderMsg("");
    setLastOrderId(null);

    try {
      const res = await startStripeCheckout(items);
      setLastOrderId(res.orderId);
      window.location.href = res.url; // ✅ redirection Stripe
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur paiement";
      if (message === "Not authenticated") {
        router.push("/account");
        return;
      }
      setOrderMsg(message);
    } finally {
      setCreating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Panier</h1>

        {orderMsg && (
          <div className="card">
            <p className={orderMsg.includes("✅") ? "text-green-700" : "text-red-600"}>
              {orderMsg}
            </p>

            {lastOrderId && (
              <p className="text-sm text-gray-600 mt-2">
                ID commande : <span className="font-mono">{lastOrderId}</span>
              </p>
            )}

            <div className="mt-3 flex gap-3">
              <Link className="btn" href="/shop">
                Continuer vos achats
              </Link>
              <Link className="btn btn-primary" href="/orders">
                Mes commandes
              </Link>
            </div>
          </div>
        )}

        {!orderMsg && (
          <>
            <p className="text-gray-600">Ton panier est vide.</p>
            <Link className="btn" href="/shop">
              Continuer vos achats
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panier</h1>
        <button className="btn btn-ghost text-sm" onClick={clear}>
          Vider le panier
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Liste des lignes */}
        <ul className="space-y-3 md:col-span-2">
          {items.map((it) => {
            const meta = metaBySlug[it.slug];
            const thumb = meta?.images?.[0];
            const line = lineTotals.find((l) => l.id === it.productId)?.total ?? 0;
            return (
              <li key={it.productId} className="card grid grid-cols-[96px_1fr_auto] gap-4">
                <Link href={`/shop/${it.slug}`} className="block">
              {thumb ? (
                <img
                  src={thumb}
                  alt={it.name}
                  className="w-24 h-24 object-cover rounded"
                />
              ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded" />
                  )}
                </Link>

                <div className="flex flex-col justify-between">
                  <div>
                    <Link className="font-medium underline" href={`/shop/${it.slug}`}>
                      {it.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      {(it.priceCents / 100).toFixed(2)} € • {meta?.category ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn"
                      onClick={() => setQty(it.productId, Math.max(1, it.quantity - 1))}
                      aria-label="Diminuer"
                    >
                      −
                    </button>
                    <input
                      className="input w-16 text-center"
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setQty(it.productId, Number(e.target.value))}
                    />
                    <button
                      className="btn"
                      onClick={() => setQty(it.productId, it.quantity + 1)}
                      aria-label="Augmenter"
                    >
                      +
                    </button>

                    <button
                      className="btn btn-ghost text-sm ml-3"
                      onClick={() => removeItem(it.productId)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {(line / 100).toFixed(2)} €
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Récapitulatif */}
        <aside className="card h-fit space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Total</p>
            <p className="font-semibold">
              {(totalCents / 100).toFixed(2)} {currency === "EUR" ? "€" : currency}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            Les frais et taxes éventuels seront confirmés lors du paiement sécurisé.
          </p>
          <button
            type="button"
            className={`btn btn-primary w-full ${creating ? "opacity-60" : ""}`}
            disabled={creating}
            onClick={handleCheckout}
          >
            {creating ? "Redirection..." : "Payer (Stripe)"}
          </button>
          <Link className="btn w-full" href="/shop">
            Continuer vos achats
          </Link>
          {loadingMeta && <p className="text-xs text-gray-600">Chargement des visuels…</p>}
        </aside>
      </div>

      {orderMsg && (
        <p className={`text-sm ${orderMsg.includes("✅") ? "text-green-700" : "text-red-600"}`}>
          {orderMsg}
        </p>
      )}
    </div>
  );
}
