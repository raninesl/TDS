import express from "express";
import Stripe from "stripe";
import { supabaseService } from "../lib/supabase.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// IMPORTANT: raw body obligatoire pour vérifier la signature Stripe
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session?.metadata?.orderId;

        if (orderId) {
          // 1) éviter double traitement (Stripe peut renvoyer l’événement)
          const { data: currentOrder, error: ordErr } = await supabaseService
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();

          if (ordErr) throw new Error(ordErr.message);

          // Si déjà PAID -> on ne décrémente pas une 2e fois
          if (currentOrder?.status !== "PAID") {
            // 2) récupérer les items
            const { data: items, error: itemsErr } = await supabaseService
              .from("order_items")
              .select("product_id, quantity")
              .eq("order_id", orderId);

            if (itemsErr) throw new Error(itemsErr.message);

            // 3) décrémenter stock
            for (const it of items ?? []) {
              if (!it.product_id) continue;

              // Récupérer le stock actuel du produit
              const { data: prod, error: prodErr } = await supabaseService
                .from("products")
                .select("id,stock")
                .eq("id", it.product_id)
                .maybeSingle();
              if (prodErr) throw new Error(prodErr.message);

              const current = Number(prod?.stock ?? 0);
              const next = Math.max(0, current - Number(it.quantity ?? 0));

              const { error: updStockErr } = await supabaseService
                .from("products")
                .update({ stock: next })
                .eq("id", it.product_id);
              if (updStockErr) throw new Error(updStockErr.message);
            }

            // 4) passer la commande à PAID
            const { error: updErr } = await supabaseService
              .from("orders")
              .update({ status: "PAID" })
              .eq("id", orderId);

            if (updErr) throw new Error(updErr.message);
          }
        }
      }

      return res.json({ received: true });
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

export default router;
