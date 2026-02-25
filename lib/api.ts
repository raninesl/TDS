import { supabase } from "@/lib/supabase/clients";

const API = process.env.NEXT_PUBLIC_API_URL!;

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text };
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  const json = await parseJson(res);
  if (!res.ok) throw new Error(json?.error || "API error");
  return json as T;
}

export async function apiAuth<T>(path: string, options: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Si body est une string JSON => mettre content-type
  if (typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const json = await parseJson(res);
  if (!res.ok) throw new Error(json?.error || "API error");
  return json as T;
}