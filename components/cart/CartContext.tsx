"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  currency: string; // "EUR"
  slug: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  totalCents: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "tds_cart_v1";

function loadInitialCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialCart());

  // Save to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = useCallback<CartContextValue["addItem"]>((item, qty = 1) => {
    const q = Math.max(1, Math.floor(qty));

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === item.productId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + q };
        return copy;
      }
      return [...prev, { ...item, quantity: q }];
    });
  }, []);

  const removeItem = useCallback<CartContextValue["removeItem"]>((productId) => {
    setItems((prev) => prev.filter((x) => x.productId !== productId));
  }, []);

  const setQty = useCallback<CartContextValue["setQty"]>((productId, qty) => {
    const q = Math.max(1, Math.floor(qty));
    setItems((prev) =>
      prev.map((x) => (x.productId === productId ? { ...x, quantity: q } : x))
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const totalCents = useMemo(
    () => items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items]
  );

  const value: CartContextValue = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      setQty,
      clear,
      totalCents,
      count,
    }),
    [items, addItem, removeItem, setQty, clear, totalCents, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}