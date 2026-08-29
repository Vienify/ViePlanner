"use client";

import { useEffect, useRef, useState } from "react";
import { Asset } from "@/lib/api";
import { Media, Theme } from "./shared";

export const THREADS_CHAR_LIMIT = 500;
const THREADS_MANUAL_BREAK = "---";

function autoSplitByLimit(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function splitThreadsContent(text: string, limit: number): string[] {
  if (!text) return [];
  const manualParts = text
    .split(THREADS_MANUAL_BREAK)
    .map((p) => p.trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const part of manualParts) {
    result.push(...autoSplitByLimit(part, limit));
  }
  return result;
}

export function ThreadsImageRow({ media, theme = "light" }: { media: Asset[]; theme?: Theme }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startX: 0, startScroll: 0, dragging: false });
  const [ratio, setRatio] = useState<number | null>(null);
  const dark = theme === "dark";
  const clampedRatio = ratio !== null ? Math.min(1, Math.max(0.8, ratio)) : 0.9;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setRatio(null);
  }, [media]);

  function slideStep() {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return (first?.offsetWidth || el?.clientWidth || 1) + 8;
  }

  function snapToNearest() {
    const el = trackRef.current;
    if (!el) return;
    const step = slideStep();
    const idx = Math.round(el.scrollLeft / step);
    el.scrollTo({ left: idx * step, behavior: "smooth" });
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
    snapToNearest();
  }

  if (media.length === 0) return null;

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ overflowAnchor: "none" }}
      className="flex gap-2 snap-x snap-mandatory overflow-x-auto scroll-smooth pr-4 [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
    >
      {media.map((a, i) => (
        <div
          key={a.id}
          style={{ aspectRatio: clampedRatio }}
          className={`relative w-[72%] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border ${
            dark ? "border-zinc-800 bg-zinc-800" : "border-zinc-200 bg-zinc-100"
          }`}
        >
          <Media
            asset={a}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            onLoad={i === 0 ? ({ width, height }) => setRatio(width / height) : undefined}
          />
          {media.length > 1 && (
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {i + 1}/{media.length}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
