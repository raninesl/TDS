import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !url.startsWith("http")) {
  throw new Error("SUPABASE_URL manquant/invalide dans backend/.env");
}
if (!anon) {
  throw new Error("SUPABASE_ANON_KEY manquant dans backend/.env");
}
if (!service) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant dans backend/.env");
}

export const supabaseAnon = createClient(url, anon);
export const supabaseService = createClient(url, service);