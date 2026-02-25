import { supabase } from "@/lib/supabase/clients";

const API = process.env.NEXT_PUBLIC_API_URL!;

type ApiError = { error?: string };

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text };
  }
}

function getErrorMessage(json: unknown): string {
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as ApiError).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return "API error";
}

// ✅ Ajoute automatiquement /api si absent
function withApiPrefix(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/api" || p.startsWith("/api/")) return p;
  return `/api${p}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${withApiPrefix(path)}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(getErrorMessage(json));
  return json as T;
}

export async function apiAuth<T>(path: string, options: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API}${withApiPrefix(path)}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const json = await parseJson(res);
  if (!res.ok) throw new Error(getErrorMessage(json));
  return json as T;
}