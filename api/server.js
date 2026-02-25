import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import uploadRouter from "./src/routes/upload.js";
import productsRouter from "./src/routes/products.js";
import ordersRouter from "./src/routes/orders.js";
import adminRouter from "./src/routes/admin.js";
import stripeRouter from "./src/routes/stripe.js";
import stripeWebhookRouter from "./src/routes/stripeWebhook.js";

const app = express();

/**
 * CORS
 * - en prod sur Render: FRONTEND_URL = https://ton-front.vercel.app
 * - en local: http://localhost:3000
 */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const allowed = [
        process.env.FRONTEND_URL,  // ton domaine “prod”
        "http://localhost:3000",
      ].filter(Boolean);

      // ✅ accepte le domaine prod + toutes les previews Vercel
      if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
        return cb(null, true);
      }

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  })
);

/**
 * IMPORTANT STRIPE WEBHOOK
 * Le webhook doit recevoir le body RAW avant express.json()
 * et souvent sur un path dédié (ex: /api/stripe/webhook)
 */
// ✅ Webhook Stripe : RAW uniquement ici
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

// ✅ JSON parser pour toutes les autres routes
app.use(express.json());

// Routes
app.use("/api/stripe", stripeRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

// Upload (séparé, plus clair)
app.use("/api/upload", uploadRouter);

// Health check (pour Render)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "tds-backend" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ Backend running on port ${port}`));