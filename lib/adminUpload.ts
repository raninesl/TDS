import { supabase } from "@/lib/supabase/clients";

const API = process.env.NEXT_PUBLIC_API_URL!;

export async function adminUploadImages(productId: string, color: string, files: FileList) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("productId", productId);
  fd.append("color", color);
  Array.from(files).forEach((f) => fd.append("files", f));

  const res = await fetch(`${API}/admin/upload-product-images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Upload error");
  return json as { ok: true; urls: string[] };
}