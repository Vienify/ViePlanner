"use client";

import { useState } from "react";
import { Asset } from "@/lib/api";
import { Media } from "./shared";

// FB chỉ cho phép ảnh đăng đơn lẻ theo tỉ lệ vuông → ngang 1.91:1 (theo đúng hướng dẫn upload) — cắt ảnh thật cho khớp thay vì giữ nguyên tỷ lệ gốc
function FacebookSingleImage({ asset }: { asset: Asset }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const clamped = ratio !== null ? Math.min(1.91, Math.max(1, ratio)) : 1.2;
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: clamped }}>
      <Media
        asset={asset}
        className="absolute inset-0 h-full w-full object-cover"
        onLoad={({ width, height }) => setRatio(width / height)}
      />
    </div>
  );
}

function Cell({
  asset,
  aspect,
  overlay,
}: {
  asset: Asset;
  aspect: string;
  overlay?: number;
}) {
  return (
    <div className={`relative ${aspect} overflow-hidden`}>
      <Media asset={asset} className="absolute inset-0 h-full w-full object-cover" />
      {overlay !== undefined && overlay > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-semibold text-white">
          +{overlay}
        </div>
      )}
    </div>
  );
}

// Mô phỏng bố cục album ảnh của Facebook
export function ImageGrid({ assets }: { assets: Asset[] }) {
  const n = assets.length;
  if (n === 0) return null;

  // 1 ảnh: cắt đúng tỉ lệ FB cho phép (vuông → ngang 1.91:1), không giữ nguyên tỉ lệ gốc tuỳ ý
  if (n === 1) return <FacebookSingleImage asset={assets[0]} />;

  // 2 ảnh: 2 cột cao bằng nhau
  if (n === 2)
    return (
      <div className="grid grid-cols-2 gap-0.5">
        <Cell asset={assets[0]} aspect="aspect-[1/1]" />
        <Cell asset={assets[1]} aspect="aspect-[1/1]" />
      </div>
    );

  // 3 ảnh: 1 ảnh lớn ngang phía trên + 2 ảnh vuông phía dưới
  if (n === 3)
    return (
      <div className="grid gap-0.5">
        <Cell asset={assets[0]} aspect="aspect-[2/1]" />
        <div className="grid grid-cols-2 gap-0.5">
          <Cell asset={assets[1]} aspect="aspect-[1/1]" />
          <Cell asset={assets[2]} aspect="aspect-[1/1]" />
        </div>
      </div>
    );

  // 4 ảnh: 1 ảnh lớn ngang phía trên + 3 ảnh nhỏ phía dưới
  if (n === 4)
    return (
      <div className="grid gap-0.5">
        <Cell asset={assets[0]} aspect="aspect-[2/1]" />
        <div className="grid grid-cols-3 gap-0.5">
          <Cell asset={assets[1]} aspect="aspect-[1/1]" />
          <Cell asset={assets[2]} aspect="aspect-[1/1]" />
          <Cell asset={assets[3]} aspect="aspect-[1/1]" />
        </div>
      </div>
    );

  // 5+ ảnh: 2 ảnh lớn trên + 3 ảnh nhỏ dưới, ảnh cuối phủ +N
  return (
    <div className="grid gap-0.5">
      <div className="grid grid-cols-2 gap-0.5">
        <Cell asset={assets[0]} aspect="aspect-[1/1]" />
        <Cell asset={assets[1]} aspect="aspect-[1/1]" />
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        <Cell asset={assets[2]} aspect="aspect-[1/1]" />
        <Cell asset={assets[3]} aspect="aspect-[1/1]" />
        <Cell asset={assets[4]} aspect="aspect-[1/1]" overlay={n - 5} />
      </div>
    </div>
  );
}
