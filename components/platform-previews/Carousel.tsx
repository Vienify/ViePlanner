"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Asset } from "@/lib/api";
import { Media, Theme } from "./shared";

export function Carousel({
  media,
  aspectMin = 0.8,
  aspectMax = 1,
  theme = "light",
}: {
  media: Asset[];
  aspectMin?: number;
  aspectMax?: number;
  theme?: Theme;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState<number | null>(null);
  const drag = useRef({ startX: 0, startScroll: 0, dragging: false });
  const clampedRatio = ratio !== null ? Math.min(aspectMax, Math.max(aspectMin, ratio)) : (aspectMin + aspectMax) / 2;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setIndex(0);
    setRatio(null);
  }, [media]);

  function slideWidth() {
    return trackRef.current?.clientWidth || 1;
  }

  function scrollToIndex(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(media.length - 1, i));
    el.scrollTo({ left: clamped * slideWidth(), behavior: "smooth" });
    setIndex(clamped);
  }

  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / slideWidth());
    setIndex(Math.max(0, Math.min(media.length - 1, i)));
  }

  function onPointerDown(e: React.PointerEvent) {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, dragging: true };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.dragging) return;
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX);
  }
  function onPointerUp() {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    const el = trackRef.current;
    if (!el) return;
    scrollToIndex(Math.round(el.scrollLeft / slideWidth()));
  }

  if (media.length === 0) {
    return (
      <div
        style={{ aspectRatio: clampedRatio }}
        className={`flex items-center justify-center text-sm ${
          theme === "dark" ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400"
        }`}
      >
        Chưa có ảnh — hãy tải ảnh lên
      </div>
    );
  }

  return (
    <div className="group relative select-none">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ overflowAnchor: "none" }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {media.map((a, i) => (
          <div
            key={a.id}
            style={{ aspectRatio: clampedRatio }}
            className={`relative w-full shrink-0 snap-center ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}
          >
            <Media
              asset={a}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              onLoad={i === 0 ? ({ width, height }) => setRatio(width / height) : undefined}
            />
          </div>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <button
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === media.length - 1}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {index + 1}/{media.length}
          </span>
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
