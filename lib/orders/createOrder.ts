import type { CartItem } from "@/components/cart/CartContext";
import { apiAuth } from "@/lib/api";

export async function createOrderFromCart(items: CartItem[]) {
  // payload minimal
  const payload = { items };

  return apiAuth<{ ok: true; orderId: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}