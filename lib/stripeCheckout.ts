import type { CartItem } from "@/components/cart/CartContext";
import { apiAuth } from "@/lib/api";

export async function startStripeCheckout(items: CartItem[]) {
  return apiAuth<{ ok: true; url: string; orderId: string }>("/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}