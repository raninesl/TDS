"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/clients";
import { apiAuth } from "@/lib/api";
import { uploadProductImage } from "@/lib/storage/uploadProductImage";
import { adminUploadImages } from "@/lib/adminUpload";

type Tab = "products" | "orders";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string; // "EUR"
  category: string | null;
  stock: number;
  is_active: boolean;
  images: string[] | null; // ancienne image principale (optionnel)
};

type OrderRow = {
  id: string;
  user_id: string | null;
  status: string;
  total_cents: number;
  currency: string; // "EUR"
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
};

type VariantRow = {
  id: string;
  color: string;
  size: string;
  stock: number;
  price_cents: number | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("products");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;

      if (!uid) {
        if (!cancelled) {
          setAuthorized(false);
          setMsg("Connecte-toi pour accéder à l’admin.");
          setLoading(false);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id,is_admin")
        .eq("id", uid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setAuthorized(false);
        setMsg(error.message);
      } else if (!profile?.is_admin) {
        setAuthorized(false);
        setMsg("Accès refusé (admin uniquement).");
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-gray-600">Chargement...</p>;

  if (!authorized) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-red-600">{msg || "Accès refusé."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="flex gap-2">
        <button
          className={`btn ${tab === "products" ? "btn-primary" : ""}`}
          onClick={() => setTab("products")}
          type="button"
        >
          Produits
        </button>
        <button
          className={`btn ${tab === "orders" ? "btn-primary" : ""}`}
          onClick={() => setTab("orders")}
          type="button"
        >
          Commandes
        </button>
      </div>

      {tab === "products" ? <AdminProducts /> : <AdminOrders />}
    </div>
  );
}

function AdminProducts() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);

  // create product
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("0"); // EUR ex: 25.00
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("0"); // stock global (optionnel si variants)
  const [imageFile, setImageFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiAuth<ProductRow[]>("/admin/products", { method: "GET" });
      setProducts(data ?? []);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur chargement produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createProduct = async () => {
    setMsg("");

    const priceCents = Math.round(Number(price) * 100);
    if (!name.trim() || !slug.trim()) {
      setMsg("Nom et slug sont obligatoires.");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setMsg("Prix invalide.");
      return;
    }

    try {
      // upload 1ère image (optionnel) — direct Supabase storage pour éviter 404 backend
      let images: string[] = [];
      if (imageFile) {
        const up = await uploadProductImage(imageFile, slug.trim());
        images = [up.publicUrl];
      }

      const productPayload = {
        name: name.trim(),
        slug: slug.trim(),
        description: null,
        price_cents: priceCents,
        currency: "EUR",
        category: category.trim() ? category.trim() : null,
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        is_active: true,
        images,
      };

      await apiAuth("/admin/products", {
        method: "POST",
        body: JSON.stringify(productPayload),
      });

      setName("");
      setSlug("");
      setPrice("0");
      setCategory("");
      setStock("0");
      setImageFile(null);

      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur création produit");
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    setMsg("");
    try {
      await apiAuth(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !is_active }),
      });
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur update");
    }
  };

  const deleteProduct = async (id: string) => {
    setMsg("");
    const ok = window.confirm("Supprimer ce produit ?");
    if (!ok) return;

    try {
      await apiAuth(`/admin/products/${id}`, { method: "DELETE" });
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create product */}
      <div className="card space-y-3">
        <p className="font-medium">Ajouter un produit</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Nom (ex: Fouta Traditionnelle)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Slug (ex: fouta-traditionnelle)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            className="input"
            placeholder="Prix (€) (ex: 25.00)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="input"
            placeholder="Stock global (optionnel)"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <input
            className="input sm:col-span-2"
            placeholder="Catégorie (ex: Fouta, Serviette...)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm text-gray-700">Image principale (optionnel)</label>
            <input
              className="input w-full"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => void createProduct()}
        >
          Ajouter
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>

      {/* List products */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Liste produits</p>
          <button className="btn btn-ghost text-sm" onClick={() => void load()}>
            Rafraîchir
          </button>
        </div>

        {loading && <p className="text-gray-600">Chargement...</p>}

        {!loading && (
          <ul className="space-y-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="card p-3 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-gray-600">
                    /{p.slug} — {(p.price_cents / 100).toFixed(2)} € — stock global{" "}
                    {p.stock} — {p.is_active ? "actif" : "inactif"}
                  </p>
                  {p.images?.[0] && (
                    <a
                      className="text-sm underline"
                      href={p.images[0]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir image principale
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn"
                    onClick={() => void toggleActive(p.id, p.is_active)}
                  >
                    {p.is_active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => void deleteProduct(p.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Variants + Images manager */}
      <VariantsAndImagesManager products={products} />
    </div>
  );
}

function VariantsAndImagesManager({ products }: { products: ProductRow[] }) {
  const [productId, setProductId] = useState("");
  const [msg, setMsg] = useState("");

  // variants form
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [vStock, setVStock] = useState("0");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const loadVariants = async (pid: string) => {
    if (!pid) return;
    setLoadingVariants(true);
    setMsg("");
    try {
      const data = await apiAuth<VariantRow[]>(`/admin/products/${pid}/variants`, {
        method: "GET",
      });
      setVariants(data ?? []);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Erreur variants");
    } finally {
      setLoadingVariants(false);
    }
  };

  const addVariant = async () => {
    setMsg("");
    if (!productId) return setMsg("Choisis un produit d’abord.");
    if (!color.trim() || !size.trim()) return setMsg("Couleur et dimension sont obligatoires.");

    try {
      await apiAuth(`/admin/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          color: color.trim(),
          size: size.trim(),
          stock: Number(vStock) || 0,
        }),
      });

      setColor("");
      setSize("");
      setVStock("0");
      await loadVariants(productId);
      setMsg("✅ Variante ajoutée.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Erreur ajout variante");
    }
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Variantes (Couleur / Dimension) & Photos</h2>

      {/* Select product */}
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          className="select"
          value={productId}
          onChange={(e) => {
            const pid = e.target.value;
            setProductId(pid);
            void loadVariants(pid);
          }}
        >
          <option value="">— Choisir un produit —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.slug})
            </option>
          ))}
        </select>

        <div className="text-sm text-gray-600 flex items-center">
          {productId ? "Produit sélectionné ✅" : "Sélectionne un produit"}
        </div>
      </div>

      {/* Add variant */}
      <div className="space-y-2">
        <p className="font-medium">Ajouter une variante</p>

        <div className="grid sm:grid-cols-3 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Couleur (ex: Bleu)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Dimension (ex: 90x150)"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Stock"
            value={vStock}
            onChange={(e) => setVStock(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={() => void addVariant()}>
          Ajouter variante
        </button>
      </div>

      {/* Upload images */}
      <UploadImagesBlock productId={productId} />

      {/* Variants list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium">Variantes existantes</p>
          <button
            className="btn btn-ghost text-sm"
            disabled={!productId}
            onClick={() => void loadVariants(productId)}
          >
            Rafraîchir
          </button>
        </div>

        {loadingVariants && <p className="text-sm text-gray-600">Chargement...</p>}

        {!loadingVariants && variants.length === 0 && (
          <p className="text-sm text-gray-600">Aucune variante.</p>
        )}

        {!loadingVariants && variants.length > 0 && (
          <ul className="space-y-2">
            {variants.map((v) => (
              <li key={v.id} className="border rounded p-3 text-sm flex items-center justify-between">
                <div>
                  Couleur: <b>{v.color}</b> — Dimension: <b>{v.size}</b> — Stock: <b>{v.stock}</b>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    if (!productId) return;
                    const ok = window.confirm("Supprimer cette variante ?");
                    if (!ok) return;
                    setMsg("");
                    try {
                      await apiAuth(`/admin/variants/${v.id}`, { method: "DELETE" });
                      await loadVariants(productId);
                      setMsg("✅ Variante supprimée.");
                    } catch (e: unknown) {
                      setMsg(e instanceof Error ? e.message : "Erreur suppression");
                    }
                  }}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {msg && (
        <p className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

function UploadImagesBlock({ productId }: { productId: string }) {
  const [color, setColor] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="card space-y-3">
      <p className="font-medium">Ajouter plusieurs photos pour une couleur</p>

      <input
        className="input w-full"
        placeholder="Couleur liée (ex: Bleu)"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

      <input
        className="input w-full"
        type="file"
        multiple
        accept="image/*"
        disabled={!productId}
        onChange={async (e) => {
          setMsg("");

          if (!productId) return setMsg("Choisis un produit d’abord.");
          if (!color.trim()) return setMsg("Indique une couleur.");
          if (!e.target.files || e.target.files.length === 0) return;

          try {
            const res = await adminUploadImages(productId, color.trim(), e.target.files);
            setMsg(`✅ ${res.urls.length} image(s) ajoutée(s).`);
            e.target.value = "";
          } catch (err: unknown) {
            setMsg(err instanceof Error ? err.message : "Erreur upload");
          }
        }}
      />

      {msg && (
        <p className={`text-sm ${msg.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const load = async () => {
    setLoading(true);
    setMsg("");

    try {
      const data = await apiAuth<OrderRow[]>("/admin/orders", { method: "GET" });
      setOrders(data ?? []);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur chargement commandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setMsg("");
    try {
      await apiAuth(`/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Erreur update status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded p-4 flex items-center justify-between">
        <p className="font-medium">Commandes</p>
        <button className="btn btn-ghost text-sm" onClick={() => void load()}>
          Rafraîchir
        </button>
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {loading && <p className="text-gray-600">Chargement...</p>}

      {!loading && (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="border rounded p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {o.id.slice(0, 8)}... — {o.status}
                  </p>
                  <p className="text-sm text-gray-600">
                    {(o.total_cents / 100).toFixed(2)} € —{" "}
                    {new Date(o.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className={`btn ${o.status === "PENDING" ? "btn-primary" : ""}`}
                    onClick={() => void updateStatus(o.id, "PENDING")}
                  >
                    PENDING
                  </button>
                  <button
                    className={`btn ${o.status === "PAID" ? "btn-primary" : ""}`}
                    onClick={() => void updateStatus(o.id, "PAID")}
                  >
                    PAID
                  </button>
                  <button
                    className={`btn ${o.status === "CANCELED" ? "btn-danger" : ""}`}
                    onClick={() => void updateStatus(o.id, "CANCELED")}
                  >
                    CANCELED
                  </button>
                </div>
              </div>

              {(o.shipping_name || o.shipping_phone || o.shipping_address) && (
                <div className="text-sm text-gray-700">
                  <div>
                    <b>Livraison:</b> {o.shipping_name ?? "—"} — {o.shipping_phone ?? "—"}
                  </div>
                  {o.shipping_address && <div>{o.shipping_address}</div>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
