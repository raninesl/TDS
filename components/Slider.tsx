"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  images: string[];
  intervalMs?: number;
};

export default function Slider({ images, intervalMs = 3000 }: Props) {
  const slides = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((src, i) => (
            <div key={`${src}-${i}`} className="w-full shrink-0">
              <img
                src={src}
                alt={`slide-${i}`}
                className="w-full aspect-[16/5] object-cover"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.src = "/window.svg";
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 backdrop-blur px-2 py-1 rounded"
        onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
        aria-label="Précédent"
      >
        ◀
      </button>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 backdrop-blur px-2 py-1 rounded"
        onClick={() => setIndex((i) => (i + 1) % slides.length)}
        aria-label="Suivant"
      >
        ▶
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-white/70 backdrop-blur rounded-full px-2 py-1">
        {slides.map((_, i) => (
          <button
            type="button"
            key={i}
            className={`h-2 w-2 rounded-full ${i === index ? "bg-[--color-brand]" : "bg-gray-300"}`}
            onClick={() => setIndex(i)}
            aria-label={`Aller au slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

