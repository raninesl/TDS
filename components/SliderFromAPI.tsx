"use client";

import { useEffect, useState } from "react";
import Slider from "./Slider";

export default function SliderFromAPI() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/slider-images", { cache: "no-store" });
        const json = (await res.json()) as { images?: string[] };
        if (!cancelled) setImages(json?.images ?? []);
      } catch {
        if (!cancelled) setImages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Slider images={images} intervalMs={1000} />;
}

