import express from "express";
import { supabaseService } from "../lib/supabase.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// POST /api/orders (user connecté)
router.post("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { items, shipping } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart items required" });
  }

  const totalCents = items.reduce((s, it) => s + it.priceCents * it.quantity, 0);
  const currency = "EUR";

  const { data: order, error: orderError } = await supabaseService
    .from("orders")
    .insert({
      user_id: userId,
      status: "PENDING",
      total_cents: totalCents,
      currency,
      shipping_name: shipping?.name ?? null,
      shipping_phone: shipping?.phone ?? null,
      shipping_address: shipping?.address ?? null,
    })
    .select("id")
    .single();

  if (orderError) return res.status(400).json({ error: orderError.message });

  const rows = items.map((it) => ({
    order_id: order.id,
    product_id: it.productId,
    product_name: it.name,
    unit_price_cents: it.priceCents,
    quantity: it.quantity,
  }));

  const { error: itemsError } = await supabaseService.from("order_items").insert(rows);
  if (itemsError) return res.status(400).json({ error: itemsError.message });

  return res.json({ ok: true, orderId: order.id });
});

export default router;