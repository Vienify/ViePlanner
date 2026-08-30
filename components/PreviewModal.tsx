"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock, Loader2, Pencil, PenLine, Send, X } from "lucide-react";
import { SiFacebook, SiInstagram, SiThreads } from "react-icons/si";
import {
  Idea,
  POST_FORMAT_ICONS,
  POST_FORMAT_LABELS,
  SocialPlatform,
  SocialStatus,
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  fetchSocialStatus,
  formatDateVN,
  publishIdea,
  updateIdea,
  weekdayVN,
} from "@/lib/api";
import { PlatformDemo } from "@/components/platform-previews/PlatformDemo";

interface Props {
  idea: Idea;
  onClose: () => void;
  onEdit: (idea: Idea, mode?: "idea" | "content") => void;
  onUpdated?: (idea: Idea) => void;
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};

const PLATFORM_POST_ID_KEY = {
  facebook: "fb_post_id",
  instagram: "ig_post_id",
  threads: "threads_post_id",
} as const;

function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === "facebook") return <SiFacebook className="h-4 w-4 shrink-0 text-[#1877F2]" />;
  if (platform === "instagram")
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]">
        <SiInstagram className="h-[70%] w-[70%] text-white" />
      </span>
    );
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black">
      <SiThreads className="h-[70%] w-[70%] text-white" />
    </span>
  );
}

export default function PreviewModal({ idea, onClose, onEdit, onUpdated }: Props) {
  const StatusIcon = STATUS_ICONS[idea.status];
  const FormatIcon = POST_FORMAT_ICONS[idea.post_format];
  const hasContent = Boolean(idea.detail_content);
  const demoIdea: Idea = { ...idea, content: idea.detail_content || idea.content };

  const [socialStatus, setSocialStatus] = useState<SocialStatus | null>(null);
  const [publishing, setPublishing] = useState<SocialPlatform | null>(null);
  const [publishError, setPublishError] = useState<{ platform: SocialPlatform; message: string } | null>(null);
  const [markingReady, setMarkingReady] = useState(false);
  const [readyError, setReadyError] = useState("");
  const [showPublish, setShowPublish] = useState(false);

  const assets = idea.assets || [];
  const hasImages =
    assets.some((a) => a.kind === "image" && a.platform === "fb") ||
    assets.some((a) => a.kind === "image" && a.platform === "ig_threads") ||
    assets.some((a) => a.kind === "demo");
  const readyToSchedule = hasContent && hasImages;
  const isReady = idea.status !== "idea";

  useEffect(() => {
    fetchSocialStatus()
      .then(setSocialStatus)
      .catch(() => setSocialStatus({ facebook: false, instagram: false, threads: false }));
  }, []);

  async function handleMarkReady() {
    setReadyError("");
    setMarkingReady(true);
    try {
      const updated = await updateIdea(idea.id, { status: "scheduled" });
      onUpdated?.(updated);
    } catch (e) {
      setReadyError(e instanceof Error ? e.message : "Không cập nhật được trạng thái");
    } finally {
      setMarkingReady(false);
    }
  }

  async function handlePublish(platform: SocialPlatform) {
    setPublishError(null);
    setPublishing(platform);
    try {
      const updated = await publishIdea(idea.id, platform);
      onUpdated?.(updated);
    } catch (e) {
      setPublishError({
        platform,
        message: e instanceof Error ? e.message : "Đăng bài thất bại",
      });
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-zinc-50 p-6 shadow-2xl ${hasContent ? "max-w-5xl" : "max-w-3xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-800">
              {formatDateVN(idea.post_date)} · {weekdayVN(idea.post_date)}
            </h2>
            <p className="text-sm text-zinc-500">
              <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-bold text-zinc-700">
                {idea.category || "Chưa phân mục"}
              </span>{" "}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[idea.status]}`}>
                <StatusIcon className="h-3 w-3" />
                {STATUS_LABELS[idea.status]}
              </span>{" "}
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                <FormatIcon className="h-3 w-3" />
                {POST_FORMAT_LABELS[idea.post_format]}
              </span>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onEdit(idea, "idea")}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <Pencil className="h-4 w-4" /> Sửa ý tưởng
            </button>
            <button
              onClick={() => onEdit(idea, "content")}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <PenLine className="h-4 w-4" /> {hasContent ? "Sửa nội dung" : "Viết nội dung"}
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { platform: "facebook", label: "Facebook", time: idea.time_fb },
              { platform: "instagram", label: "Instagram", time: idea.time_ig },
              { platform: "threads", label: "Threads", time: idea.time_threads },
            ] as { platform: SocialPlatform; label: string; time: string | null | undefined }[]
          ).map((row) => (
            <div
              key={row.platform}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm"
            >
              <PlatformIcon platform={row.platform} />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <p className="text-sm text-zinc-500">{row.label}</p>
                <p className="flex items-center gap-1 text-sm font-semibold text-zinc-800">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  {row.time || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {hasContent ? (
          <>
            {readyError && (
              <p className="mb-3 flex items-start gap-1.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {readyError}
              </p>
            )}
            <PlatformDemo
              idea={demoIdea}
              assets={idea.assets || []}
              showReadyButton={readyToSchedule}
              isReady={isReady}
              marking={markingReady}
              onMarkReady={handleMarkReady}
              publishSlot={
                <>
                  {!showPublish && (
                    <button
                      type="button"
                      onClick={() => setShowPublish(true)}
                      className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                    >
                      <Send className="h-4 w-4" /> Đăng ngay
                    </button>
                  )}
                  <div
                    className={`absolute inset-0 z-10 flex items-center justify-end gap-2 bg-zinc-50 pl-2 transition-transform duration-300 ease-out ${
                      showPublish ? "translate-x-0" : "pointer-events-none translate-x-full"
                    }`}
                  >
                    {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map((platform) => {
                      const postId = idea[PLATFORM_POST_ID_KEY[platform]];
                      const configured = socialStatus?.[platform] ?? false;
                      const isLoading = publishing === platform;
                      const label = PLATFORM_LABELS[platform];
                      if (postId) {
                        return (
                          <span
                            key={platform}
                            className="flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
                          >
                            <PlatformIcon platform={platform} /> Đã đăng {label}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={platform}
                          disabled={!configured || isLoading}
                          onClick={() => handlePublish(platform)}
                          title={configured ? undefined : `Chưa cấu hình ${label} trong backend/.env`}
                          className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlatformIcon platform={platform} />}
                          Đăng lên {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setShowPublish(false)}
                      title="Đóng"
                      className="flex items-center justify-center rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-200/70"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </>
              }
            />
            {publishError && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {PLATFORM_LABELS[publishError.platform]}: {publishError.message}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Ý tưởng bài viết
              </p>
              <p className="whitespace-pre-line text-sm text-zinc-800">
                {idea.content || "Chưa có nội dung"}
              </p>
            </div>
            {idea.asset_note && (
              <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Asset cần chuẩn bị
                </p>
                <p className="whitespace-pre-line text-sm text-zinc-800">{idea.asset_note}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

