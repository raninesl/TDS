import express from "express";
import Stripe from "stripe";
import { requireAuth } from "../middlewares/auth.js";
import { supabaseService } from "../lib/supabase.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shipping } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart items required" });
    }

    // ✅ Base URL stable pour les redirections Stripe
    const baseUrl =
      process.env.FRONTEND_PUBLIC_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    // 1) Créer une commande PENDING en DB
    const totalCents = items.reduce((s, it) => s + it.priceCents * it.quantity, 0);

    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: userId,
        status: "PENDING",
        total_cents: totalCents,
        currency: "EUR",
        shipping_name: shipping?.name ?? null,
        shipping_phone: shipping?.phone ?? null,
        shipping_address: shipping?.address ?? null,
      })
      .select("id")
      .single();

    if (orderError) return res.status(400).json({ error: orderError.message });

    // 2) Insérer les items
    const rows = items.map((it) => ({
      order_id: order.id,
      product_id: it.productId,
      product_name: it.name,
      unit_price_cents: it.priceCents,
      quantity: it.quantity,
    }));

    const { error: itemsError } = await supabaseService.from("order_items").insert(rows);
    if (itemsError) return res.status(400).json({ error: itemsError.message });

    // 3) Créer la session Stripe Checkout
    const line_items = items.map((it) => ({
      price_data: {
        currency: "eur",
        product_data: { name: it.name },
        unit_amount: it.priceCents,
      },
      quantity: it.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel?order_id=${order.id}`,
    });

    return res.json({ ok: true, url: session.url, orderId: order.id });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Stripe error" });
  }
});

export default router;