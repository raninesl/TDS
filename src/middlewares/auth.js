import { supabaseAnon, supabaseService } from "../lib/supabase.js";

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing Bearer token" });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid token" });

  req.user = data.user;
  next();
}

export async function requireAdmin(req, res, next) {
  const uid = req.user?.id;
  if (!uid) return res.status(401).json({ error: "No user" });

  const { data, error } = await supabaseService
    .from("profiles")
    .select("is_admin")
    .eq("id", uid)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data?.is_admin) return res.status(403).json({ error: "Admin only" });

  next();
}