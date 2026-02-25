import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function listImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);
  const exclude = new Set(["tds-logo.png", "favicon.ico", "icon.png", "apple-touch-icon.png"]);
  return files
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      if (!allowed.has(ext)) return false;
      if (exclude.has(f)) return false;
      return true;
    })
    .map((f) => `/${f}`);
}

export async function GET() {
  const pub = path.join(process.cwd(), "public");
  const sliderDir = path.join(pub, "slider");

  let images = listImages(sliderDir);
  if (images.length > 0) {
    images = images.map((u) => `/slider${u}`);
  } else {
    images = listImages(pub);
  }

  const normalize = (s: string) =>
    decodeURIComponent(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const desiredOrderRaw = [
    "fouta piscine.png",
    "tissu.webp",
    "fouta sur bois.jpg",
    "bain.jpeg",
    "tapis de bain.avif",
    "draps de lit.jpg",
  ];
  const desiredOrder = desiredOrderRaw.map((s) => normalize(s));
  const desiredRoots = desiredOrder.map((s) => s.replace(/\.[^.]+$/, ""));

  const orderMap = new Map(desiredOrder.map((name, idx) => [name, idx]));
  const idxOf = (p: string) => {
    const base = normalize(path.basename(p));
    if (orderMap.has(base)) return orderMap.get(base) as number;
    const root = base.replace(/\.[^.]+$/, "");
    const containsIdx = desiredRoots.findIndex((r) => root.includes(r));
    return containsIdx >= 0 ? containsIdx : Number.MAX_SAFE_INTEGER;
  };
  images.sort((a, b) => idxOf(a) - idxOf(b));

  return NextResponse.json({ images });
}

