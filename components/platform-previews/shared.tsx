"use client";

import { ReactNode, useState } from "react";
import { Asset, assetUrl, isVideo } from "@/lib/api";

export type Platform = "facebook" | "instagram" | "threads";
export type Theme = "light" | "dark";

export const CHANNEL_NAME = "Kênh của tôi";

// "---" chỉ là cú pháp riêng để tách comment cho Threads — FB/IG phải bỏ ký tự này khi hiển thị.
// Chỉ gộp khoảng trắng/tab thừa, KHÔNG đụng tới ký tự xuống dòng để giữ đúng các đoạn cách nhau 2 lần Enter.
export function cleanCaption(text: string): string {
  return text
    .split("---")
    .join(" ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// FB/IG hiển thị caption rút gọn, có nút "Xem thêm" / "Ẩn bớt" (card đã giới hạn chiều cao + cuộn nên mở rộng không đẩy giãn khung demo)
export function TruncatedCaption({
  text,
  limit,
  prefix,
  className,
}: {
  text: string;
  limit: number;
  prefix?: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const clean = cleanCaption(text || "");
  if (!clean) return null;
  const isLong = clean.length > limit;
  const shown = expanded || !isLong ? clean : clean.slice(0, limit).trimEnd() + "…";
  return (
    <p className={className}>
      {prefix ? <span className="font-semibold">{prefix}</span> : null}{prefix ? " " : null}
      <span className="whitespace-pre-line">{shown}</span>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-1 font-semibold text-zinc-400 hover:underline"
        >
          {expanded ? "Ẩn bớt" : "Xem thêm"}
        </button>
      )}
    </p>
  );
}

export function Media({
  asset,
  className,
  onLoad,
}: {
  asset: Asset;
  className?: string;
  onLoad?: (size: { width: number; height: number }) => void;
}) {
  return isVideo(asset) ? (
    <video
      src={assetUrl(asset)}
      controls
      className={className}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (onLoad && v.videoWidth && v.videoHeight) onLoad({ width: v.videoWidth, height: v.videoHeight });
      }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(asset)}
      alt=""
      className={className}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (onLoad && img.naturalWidth && img.naturalHeight) onLoad({ width: img.naturalWidth, height: img.naturalHeight });
      }}
    />
  );
}

export function Avatar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
        dark ? "bg-gradient-to-br from-zinc-500 to-zinc-700" : "bg-gradient-to-br from-indigo-500 to-purple-600"
      }`}
    >
      K
    </div>
  );
}
