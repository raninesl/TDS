import express from "express";
import { supabaseService } from "../lib/supabase.js";

const router = express.Router();

// GET /api/products  (public)
router.get("/", async (req, res) => {
  const { data, error } = await supabaseService
    .from("products")
    .select("id,name,slug,price_cents,currency,category,images")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data ?? []);
});

// GET /api/products/:slug (public)
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabaseService
    .from("products")
    .select("id,name,slug,description,price_cents,currency,category,stock,images")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Not found" });

  return res.json(data);
});

// GET /api/products/:slug/full
router.get("/:slug/full", async (req, res) => {
  const { slug } = req.params;

  const { data: product, error: pErr } = await supabaseService
    .from("products")
    .select("id,name,slug,description,price_cents,currency,category,stock,is_active,images")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (pErr) return res.status(400).json({ error: pErr.message });
  if (!product) return res.status(404).json({ error: "Not found" });

  const { data: variants, error: vErr } = await supabaseService
    .from("product_variants")
    .select("id,color,size,stock,price_cents,is_active")
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (vErr) return res.status(400).json({ error: vErr.message });

  const { data: images, error: iErr } = await supabaseService
    .from("product_images")
    .select("id,color,url,sort_order")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  if (iErr) return res.status(400).json({ error: iErr.message });

  return res.json({ product, variants: variants ?? [], images: images ?? [] });
});
export default router;
