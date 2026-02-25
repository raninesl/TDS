import express from "express";
import multer from "multer";
import { supabaseService } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/admin/upload-product-images
 * FormData:
 * - productId (uuid)
 * - color (text, optionnel)
 * - files (multiple)
 */
router.post(
  "/upload-product-images",
  requireAuth,
  requireAdmin,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const productId = req.body.productId;
      const color = req.body.color || null;
      const files = req.files;

      if (!productId) return res.status(400).json({ error: "productId is required" });
      if (!files || files.length === 0) return res.status(400).json({ error: "files are required" });

      const uploadedUrls = [];

      // calcul sort_order = dernier + 1
      const { data: existing, error: exErr } = await supabaseService
        .from("product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1);

      if (exErr) return res.status(400).json({ error: exErr.message });
      const startOrder = existing?.[0]?.sort_order ?? 0;
      let currentOrder = startOrder + 1;

      for (const f of files) {
        const ext = (f.originalname.split(".").pop() || "jpg").toLowerCase();
        const filename = `${productId}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const path = `products/${filename}`;

        const { error: upErr } = await supabaseService.storage
          .from("product-images")
          .upload(path, f.buffer, { contentType: f.mimetype, upsert: false });

        if (upErr) return res.status(400).json({ error: upErr.message });

        const { data } = supabaseService.storage.from("product-images").getPublicUrl(path);
        const url = data.publicUrl;

        // enregistrer dans product_images
        const { error: insErr } = await supabaseService.from("product_images").insert({
          product_id: productId,
          color,
          url,
          sort_order: currentOrder++,
        });

        if (insErr) return res.status(400).json({ error: insErr.message });

        uploadedUrls.push(url);
      }

      return res.json({ ok: true, urls: uploadedUrls });
    } catch (e) {
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
