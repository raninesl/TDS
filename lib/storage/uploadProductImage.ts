import { supabase } from "@/lib/supabase/clients";

export async function uploadProductImage(file: File, slug: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${slug}-${Date.now()}.${safeExt}`;
  const path = `products/${filename}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}