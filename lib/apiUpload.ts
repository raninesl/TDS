import { supabase } from "@/lib/supabase/clients";

const API = process.env.NEXT_PUBLIC_API_URL;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

function safeJsonParse(text: string): JsonValue | null {
  try {
    return text ? (JSON.parse(text) as JsonValue) : null;
  } catch {
    return null;
  }
}

export async function apiUpload(path: string, formData: FormData) {
  if (!API) throw new Error("NEXT_PUBLIC_API_URL is missing in .env.local");

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await res.text();
  const parsed = safeJsonParse(text);

  // Si le backend renvoie du HTML (souvent 404), parsed = null
  if (!parsed) {
    throw new Error(
      `Backend did not return JSON (status ${res.status}). Check URL/route: ${API}${path}`
    );
  }

  // parsed est JsonValue, on essaie de lire parsed.error si c’est un objet
  if (!res.ok) {
    if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
      const errVal = (parsed as { error?: JsonValue }).error;
      throw new Error(typeof errVal === "string" ? errVal : "Upload error");
    }
    throw new Error("Upload error");
  }

  return parsed;
}