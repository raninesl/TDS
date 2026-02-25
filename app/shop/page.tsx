"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  category: string | null;
  images: string[] | null;
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await apiGet<Product[]>("/products");
        if (!cancelled) setProducts(data);
      } catch (e: unknown) {
        if (!cancelled) setErrorMsg(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Boutique</h1>

      {loading && <p className="text-gray-600">Chargement...</p>}
      {errorMsg && <p className="text-red-600">{errorMsg}</p>}

      {!loading && !errorMsg && (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <li key={p.id} className="card space-y-3 hover:shadow-lg transition">
              {p.images?.[0] ? (
                <Link href={`/shop/${p.slug}`}>
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-44 object-cover rounded-md"
                  />
                </Link>
              ) : (
                <Link href={`/shop/${p.slug}`}>
                  <div className="w-full h-44 rounded-md bg-gray-100" />
                </Link>
              )}

              <Link href={`/shop/${p.slug}`}>
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.category ?? "—"}</p>
                </div>
              </Link>

              <p className="font-semibold">
                {(p.price_cents / 100).toFixed(2)} €
              </p>

              <Link className="btn btn-ghost text-sm inline-flex" href={`/shop/${p.slug}`}>
                Voir le produit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
