"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useCart } from "@/components/cart/CartContext";

type Variant = {
  id: string;
  color: string;
  size: string;
  stock: number;
  price_cents: number | null;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string; // "EUR"
  category: string | null;
  stock: number;
  images?: string[] | null;
};

type ProductImage = {
  id: string;
  color: string | null;
  url: string;
  sort_order: number;
};

type FullProductResponse = {
  product: Product;
  variants: Variant[];
  images: ProductImage[];
};

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const { addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<FullProductResponse | null>(null);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const d = await apiGet<FullProductResponse>(`/products/${slug}/full`);
        if (cancelled) return;

        setData(d);

        // init selections
        const firstColor = d.variants?.[0]?.color ?? "";
        setSelectedColor(firstColor);

        const firstSize =
          d.variants?.find((v) => v.color === firstColor)?.size ??
          d.variants?.[0]?.size ??
          "";
        setSelectedSize(firstSize);
      } catch (e: unknown) {
        if (!cancelled) setErrorMsg(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const product = data?.product;

  const colors = useMemo(() => {
    const set = new Set<string>();
    (data?.variants ?? []).forEach((v) => set.add(v.color));
    return Array.from(set);
  }, [data]);

  const sizesForColor = useMemo(() => {
    const set = new Set<string>();
    (data?.variants ?? [])
      .filter((v) => v.color === selectedColor)
      .forEach((v) => set.add(v.size));
    return Array.from(set);
  }, [data, selectedColor]);

  const selectedVariant = useMemo(() => {
    return (data?.variants ?? []).find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
  }, [data, selectedColor, selectedSize]);

  const priceCents = selectedVariant?.price_cents ?? product?.price_cents ?? 0;
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;

  const imagesForColor = useMemo(() => {
    const imgs = data?.images ?? [];
    const byColor = imgs.filter((im) => im.color === selectedColor);
    if (byColor.length > 0) return byColor;
    const generic = imgs.filter((im) => im.color === null);
    return generic;
  }, [data, selectedColor]);

  const imageUrls: string[] = useMemo(() => {
    if (imagesForColor.length > 0) {
      return imagesForColor.map((im) => im.url);
    }
    return product?.images ?? [];
  }, [imagesForColor, product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor, data]);

  // when color changes, ensure size exists for that color
  useEffect(() => {
    if (!data) return;
    if (!selectedColor) return;

    const validSizes = new Set(
      data.variants.filter((v) => v.color === selectedColor).map((v) => v.size)
    );

    if (!validSizes.has(selectedSize)) {
      const first = data.variants.find((v) => v.color === selectedColor)?.size ?? "";
      setSelectedSize(first);
    }
  }, [data, selectedColor, selectedSize]);

  if (loading) return <p className="text-gray-600">Chargement...</p>;
  if (errorMsg) return <p className="text-red-600">{errorMsg}</p>;
  if (!data || !product) return <p className="text-gray-600">Produit introuvable.</p>;

  const hasVariants = (data?.variants?.length ?? 0) > 0;
  const canAdd = hasVariants ? !!selectedVariant && stock > 0 : (product?.stock ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Image principale (avec fallback sur product.images) */}
      {imageUrls[selectedImageIndex] && (
        <img
          src={imageUrls[selectedImageIndex]}
          alt={product.name}
          className="w-full max-w-3xl h-96 object-cover rounded-xl shadow-sm"
        />
      )}

      <div>
        <p className="text-sm text-gray-600">{product.category ?? "—"}</p>
        <h1 className="text-3xl font-semibold">{product.name}</h1>
      </div>

      <p className="text-gray-700 max-w-3xl">{product.description ?? "—"}</p>

      {/* Variants UI */}
      {data.variants.length === 0 ? (
        <p className="text-sm text-gray-600">
          Aucune variante (couleur/dimension) n’a été ajoutée pour ce produit.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Couleur</label>
            <select
              className="select"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
            >
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Dimension</label>
            <select
              className="select"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
            >
              {sizesForColor.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Galerie images (fonctionne sur product_images ou product.images) */}
      {imageUrls.length > 1 && (
        <div className="flex gap-3 flex-wrap">
          {imageUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setSelectedImageIndex(idx)}
              className={`${idx === selectedImageIndex ? "ring-2 ring-[--color-brand]" : ""}`}
            >
              <img
                src={url}
                alt={product.name}
                className="w-28 h-20 object-cover rounded border"
              />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xl font-semibold">{(priceCents / 100).toFixed(2)} €</p>
        <p className="text-sm text-gray-600">Stock : {stock}</p>
      </div>

      <button
        className={`btn btn-primary ${!canAdd ? "opacity-60" : ""}`}
        disabled={!canAdd}
        onClick={() => {
          if (hasVariants) {
            if (!selectedVariant) return;
            addItem(
              {
                productId: product.id,
                name: `${product.name} — ${selectedVariant.color} / ${selectedVariant.size}`,
                priceCents,
                currency: "EUR",
                slug: product.slug,
              },
              1
            );
          } else {
            if (!product) return;
            addItem(
              {
                productId: product.id,
                name: product.name,
                priceCents: product.price_cents,
                currency: "EUR",
                slug: product.slug,
              },
              1
            );
          }
        }}
      >
        Ajouter au panier
      </button>
    </div>
  );
}
