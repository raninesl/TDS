import express from "express";
import { supabaseService } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = express.Router();

// GET /api/admin/products (admin)
router.get("/products", requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseService
    .from("products")
    .select("id,name,slug,price_cents,currency,category,stock,is_active,images")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data ?? []);
});

// POST /api/admin/products (admin)
router.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const p = req.body;

  if (!p?.name || !p?.slug || typeof p?.price_cents !== "number") {
    return res.status(400).json({ error: "Missing fields: name, slug, price_cents" });
  }

  const { data, error } = await supabaseService
    .from("products")
    .insert(p)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// PATCH /api/admin/products/:id (admin)
router.patch("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseService
    .from("products")
    .update(req.body)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/admin/products/:id (admin)
router.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseService.from("products").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ ok: true });
});
// GET /api/admin/orders (admin)
router.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseService
    .from("orders")
    .select("id,user_id,status,total_cents,currency,created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data ?? []);
});

// PATCH /api/admin/orders/:id (admin)
router.patch("/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Missing status" });

  // Récupérer le statut actuel pour éviter double décrément
  const { data: current, error: curErr } = await supabaseService
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (curErr) return res.status(400).json({ error: curErr.message });

  if (status === "PAID" && current?.status !== "PAID") {
    // Charger les items puis décrémenter les stocks produits
    const { data: items, error: itemsErr } = await supabaseService
      .from("order_items")
      .select("product_id,quantity")
      .eq("order_id", id);
    if (itemsErr) return res.status(400).json({ error: itemsErr.message });

    for (const it of items ?? []) {
      if (!it.product_id) continue;
      const { data: prod, error: pErr } = await supabaseService
        .from("products")
        .select("id,stock")
        .eq("id", it.product_id)
        .maybeSingle();
      if (pErr) return res.status(400).json({ error: pErr.message });
      const currentStock = Number(prod?.stock ?? 0);
      const nextStock = Math.max(0, currentStock - Number(it.quantity ?? 0));
      const { error: updErr } = await supabaseService
        .from("products")
        .update({ stock: nextStock })
        .eq("id", it.product_id);
      if (updErr) return res.status(400).json({ error: updErr.message });
    }
  }

  const { data, error } = await supabaseService.from("orders").update({ status }).eq("id", id).select("*").single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// GET /api/admin/products/:id/variants
router.get("/products/:id/variants", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseService
    .from("product_variants")
    .select("id,color,size,sku,price_cents,stock,is_active,created_at")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data ?? []);
});

// POST /api/admin/products/:id/variants
router.post("/products/:id/variants", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { color, size, stock, price_cents } = req.body;

  if (!color || !size) return res.status(400).json({ error: "color and size are required" });

  const payload = {
    product_id: id,
    color,
    size,
    stock: Number(stock) || 0,
    price_cents: price_cents === null || price_cents === undefined ? null : Number(price_cents),
  };

  const { data, error } = await supabaseService
    .from("product_variants")
    .insert(payload)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});
export default router;
