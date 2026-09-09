"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, Moon, Sun } from "lucide-react";
import { Asset, fetchSocialAccounts, Idea, SocialAccounts } from "@/lib/api";
import { FacebookPreview } from "./FacebookPreview";
import { InstagramPreview } from "./InstagramPreview";
import { ThreadsPreview } from "./ThreadsPreview";
import { Platform, Theme } from "./shared";

// Khối demo dùng chung: tab chọn nền tảng + nút chuyển sáng/tối + 3 preview xếp chồng (chiều cao luôn bằng nhau).
// Dùng lại ở cả IdeaForm (khi đang sửa) và PreviewModal (khi xem nhanh, nếu đã có nội dung chi tiết).
export function PlatformDemo({
  idea,
  assets,
  showReadyButton,
  isReady,
  marking,
  onMarkReady,
  publishSlot,
  platform: controlledPlatform,
  onPlatformChange,
}: {
  idea: Idea;
  assets: Asset[];
  showReadyButton?: boolean;
  isReady?: boolean;
  marking?: boolean;
  onMarkReady?: () => void;
  publishSlot?: ReactNode;
  /** Nếu truyền vào, tab nền tảng được điều khiển từ ngoài (ví dụ đồng bộ với tab nhập nội dung). */
  platform?: Platform;
  onPlatformChange?: (p: Platform) => void;
}) {
  const [internalPlatform, setInternalPlatform] = useState<Platform>("facebook");
  const platform = controlledPlatform ?? internalPlatform;
  const setPlatform = (p: Platform) => {
    if (onPlatformChange) onPlatformChange(p);
    else setInternalPlatform(p);
  };
  const [theme, setTheme] = useState<Theme>("light");
  const [accounts, setAccounts] = useState<SocialAccounts | null>(null);

  // Lấy tên + ảnh đại diện thật của trang/tài khoản đã kết nối để demo giống trang thật.
  useEffect(() => {
    fetchSocialAccounts()
      .then(setAccounts)
      .catch(() => setAccounts(null));
  }, []);

  const demos = assets.filter((a) => a.kind === "demo");
  const fbImages = assets.filter((a) => a.kind === "image" && a.platform === "fb");
  const igImages = assets.filter((a) => a.kind === "image" && (a.platform === "ig" || a.platform === "ig_threads"));
  const threadsImages = assets.filter((a) => a.kind === "image" && (a.platform === "threads" || a.platform === "ig_threads"));
  const fbMedia = fbImages.length > 0 ? fbImages : demos;
  const igMedia = igImages.length > 0 ? igImages : demos;
  const threadsMedia = threadsImages.length > 0 ? threadsImages : demos;
  // Mỗi nền tảng dùng nội dung riêng; fallback về nội dung chung (legacy) rồi ý tưởng.
  const fbIdea: Idea = { ...idea, content: idea.detail_fb || idea.detail_content || idea.content };
  const igIdea: Idea = { ...idea, content: idea.detail_ig || idea.detail_content || idea.content };
  const threadsIdea: Idea = { ...idea, content: idea.detail_threads || idea.detail_content || idea.content };
  const tabs: { key: Platform; label: string }[] = [
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "threads", label: "Threads" },
  ];

  return (
    <div>
      <div className="relative mb-3 flex flex-wrap items-center gap-2 overflow-hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setPlatform(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              platform === t.key ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {showReadyButton && (
            <button
              type="button"
              onClick={onMarkReady}
              disabled={isReady || marking}
              title={isReady ? "Đã sẵn sàng đăng tự động" : "Đánh dấu sẵn sàng đăng tự động"}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                isReady
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              }`}
            >
              {marking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isReady ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : null}
              Sẵn sàng đăng
            </button>
          )}
          {publishSlot}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title={theme === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
            className="flex items-center justify-center rounded-full p-1.5 text-zinc-600 transition hover:bg-zinc-200/70"
          >
            {theme === "light" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
        </div>
      </div>
      <div className={`grid grid-cols-1 rounded-2xl p-4 sm:p-6 ${theme === "dark" ? "bg-zinc-950" : "bg-zinc-200/60"}`}>
        <div className={`col-start-1 row-start-1 ${platform === "facebook" ? "visible" : "invisible pointer-events-none"}`}>
          <FacebookPreview idea={fbIdea} media={fbMedia} theme={theme} account={accounts?.facebook} />
        </div>
        <div className={`col-start-1 row-start-1 ${platform === "instagram" ? "visible" : "invisible pointer-events-none"}`}>
          <InstagramPreview idea={igIdea} media={igMedia} theme={theme} account={accounts?.instagram} />
        </div>
        <div className={`col-start-1 row-start-1 ${platform === "threads" ? "visible" : "invisible pointer-events-none"}`}>
          <ThreadsPreview idea={threadsIdea} media={threadsMedia} theme={theme} account={accounts?.threads} />
        </div>
      </div>
    </div>
  );
}
