"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/clients";

type Order = {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
};

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [thumbByProductId, setThumbByProductId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMsg("Connecte-toi pour voir cette commande.");
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id,status,total_cents,currency,created_at,shipping_name,shipping_phone,shipping_address")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (orderError) {
        setMsg(orderError.message);
        setOrder(null);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!orderData) {
        setMsg("Commande introuvable.");
        setOrder(null);
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("id,product_id,product_name,unit_price_cents,quantity")
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        setMsg(itemsError.message);
        setOrder(orderData as Order);
        setItems([]);
        setLoading(false);
        return;
      }

      setOrder(orderData as Order);
      setItems((itemsData ?? []) as OrderItem[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const ids = Array.from(new Set(items.map((it) => it.product_id).filter(Boolean)));
    if (ids.length === 0) return;
    let cancelled = false;

    (async () => {
      const map: Record<string, string> = {};

      const { data: imgs } = await supabase
        .from("product_images")
        .select("product_id,url,sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true });

      if (imgs) {
        for (const im of imgs as Array<{ product_id: string; url: string }>) {
          if (!map[im.product_id]) map[im.product_id] = im.url;
        }
      }

      const missing = ids.filter((pid) => !map[pid]);
      if (missing.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id,images")
          .in("id", missing);
        if (prods) {
          for (const p of prods as Array<{ id: string; images: string[] | null }>) {
            const url = p.images?.[0];
            if (url) map[p.id] = url;
          }
        }
      }

      if (!cancelled) setThumbByProductId(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (loading) return <p className="text-gray-600">Chargement...</p>;

  if (msg) return <p className="text-red-600">{msg}</p>;

  if (!order) return <p className="text-gray-600">Commande introuvable.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Détail commande</h1>
        <Link className="btn btn-ghost text-sm" href="/orders">
          Retour
        </Link>
      </div>

      <div className="border rounded p-4 space-y-1">
        <p>
          <span className="text-gray-600">ID :</span>{" "}
          <span className="font-mono">{order.id}</span>
        </p>
        <p>
          <span className="text-gray-600">Date :</span>{" "}
          {new Date(order.created_at).toLocaleString("fr-FR")}
        </p>
        <p>
          <span className="text-gray-600">Statut :</span> {order.status}
        </p>
        <p className="font-semibold">
          Total : {(order.total_cents / 100).toFixed(2)} {order.currency}
        </p>
      </div>

      <div className="border rounded p-4">
        <p className="font-medium mb-2">Articles</p>
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-4">
              <div className="w-16 h-16">
                {thumbByProductId[it.product_id] ? (
                  <img
                    src={thumbByProductId[it.product_id]}
                    alt={it.product_name}
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded border" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{it.product_name}</p>
                <p className="text-sm text-gray-600">
                  {(it.unit_price_cents / 100).toFixed(2)} {order.currency} × {it.quantity}
                </p>
              </div>
              <p className="font-semibold">
                {((it.unit_price_cents * it.quantity) / 100).toFixed(2)} {order.currency}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
