"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, Clock, ImagePlus, Lightbulb, MonitorPlay, Paperclip, Pencil, PenLine, Sparkles, Tag, X } from "lucide-react";
import { SiFacebook, SiInstagram, SiThreads } from "react-icons/si";
import {
  Asset,
  AssetKind,
  AssetPlatform,
  Category,
  Idea,
  IdeaInput,
  POST_FORMAT_LABELS,
  PostFormat,
  assetUrl,
  createIdea,
  deleteAsset,
  fetchCategories,
  isVideo,
  updateIdea,
  uploadAssets,
} from "@/lib/api";
import { PlatformDemo } from "@/components/platform-previews/PlatformDemo";

const TIME_FIELDS: { key: "time_fb" | "time_ig" | "time_threads"; label: string; platform: "facebook" | "instagram" | "threads" }[] = [
  { key: "time_fb", label: "Facebook", platform: "facebook" },
  { key: "time_ig", label: "Instagram", platform: "instagram" },
  { key: "time_threads", label: "Threads", platform: "threads" },
];

function TimePlatformIcon({ platform }: { platform: "facebook" | "instagram" | "threads" }): ReactNode {
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

// Ô nhập giờ dạng HH:MM tự viết (thay cho <input type="time"> mặc định của trình duyệt) để:
// - Tự nhảy từ giờ sang phút khi gõ đủ 2 số, rồi nhảy sang nền tảng kế tiếp khi gõ xong phút.
// - Nếu chỉ nhập giờ rồi rời khỏi ô (blur/tab), tự hiểu phút là "00".
function TimeHM({
  value,
  onChange,
  hourRef,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  hourRef?: (el: HTMLInputElement | null) => void;
  onComplete?: () => void;
}) {
  const [h, setH] = useState(() => value.split(":")[0] || "");
  const [m, setM] = useState(() => value.split(":")[1] || "");
  const minuteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setH(value.split(":")[0] || "");
    setM(value.split(":")[1] || "");
  }, [value]);

  function commit(nh: string, nm: string) {
    if (nh && nm) onChange(`${nh}:${nm}`);
    else if (!nh && !nm) onChange("");
  }

  function finalize(nh: string, nm: string) {
    let fh = nh;
    let fm = nm;
    if (fh.length === 1) fh = fh.padStart(2, "0");
    if (fh && !fm) fm = "00";
    else if (fm.length === 1) fm = fm.padStart(2, "0");
    if (fh !== nh) setH(fh);
    if (fm !== nm) setM(fm);
    commit(fh, fm);
  }

  return (
    <span className="flex items-center gap-0.5 text-sm tabular-nums text-zinc-800">
      <input
        ref={hourRef}
        type="text"
        inputMode="numeric"
        placeholder="--"
        maxLength={2}
        value={h}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = digits.length === 2 && Number(digits) > 23 ? "23" : digits;
          setH(clamped);
          commit(clamped, m);
          if (clamped.length === 2) {
            minuteRef.current?.focus();
            minuteRef.current?.select();
          }
        }}
        onBlur={() => finalize(h, m)}
        className="w-5 border-none bg-transparent p-0 text-right focus:outline-none focus:ring-0"
      />
      <span className="text-zinc-400">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        placeholder="--"
        maxLength={2}
        value={m}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = digits.length === 2 && Number(digits) > 59 ? "59" : digits;
          setM(clamped);
          commit(h, clamped);
          if (clamped.length === 2) onComplete?.();
        }}
        onBlur={() => finalize(h, m)}
        className="w-5 border-none bg-transparent p-0 focus:outline-none focus:ring-0"
      />
    </span>
  );
}

interface Props {
  idea?: Idea | null; // null = tạo mới
  defaultDate?: string;
  initialMode?: "idea" | "content"; // chỉ áp dụng khi đang sửa ý tưởng có sẵn
  onClose: () => void;
  onSaved: () => void;
  onSavedContent?: (ideaId: number) => void;
}

export default function IdeaForm({ idea, defaultDate, initialMode, onClose, onSaved, onSavedContent }: Props) {
  const [mode, setMode] = useState<"idea" | "content">(initialMode || (idea ? "content" : "idea"));
  const [form, setForm] = useState<IdeaInput>({
    post_date: idea?.post_date || defaultDate || new Date().toLocaleDateString("sv-SE"),
    category: idea?.category || "",
    post_format: idea?.post_format || "image",
    content: idea?.content || "",
    detail_content: idea?.detail_content || "",
    asset_note: idea?.asset_note || "",
    time_fb: idea?.time_fb || "",
    time_ig: idea?.time_ig || "",
    time_threads: idea?.time_threads || "",
    status: idea?.status || "idea",
  });
  const [assets, setAssets] = useState<Asset[]>(idea?.assets || []);
  const [savedId, setSavedId] = useState<number | null>(idea?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Tự động lưu nội dung chi tiết khi đang gõ (không đổi trạng thái) — chỉ khi ý tưởng đã tồn tại và đang ở chế độ "Viết nội dung".
  const skipFirstAutosave = useRef(true);
  useEffect(() => {
    if (mode !== "content" || !savedId) return;
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const t = setTimeout(() => {
      setAutoSaving(true);
      updateIdea(savedId, form, { silent: true })
        .then(() => onSaved())
        .catch(() => {})
        .finally(() => setAutoSaving(false));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.detail_content, mode, savedId]);

  const set = (k: keyof IdeaInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setTimeValue = (k: "time_fb" | "time_ig" | "time_threads", v: string) => setForm((f) => ({ ...f, [k]: v }));
  const timeHourRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function ensureSaved(overrideForm?: IdeaInput, options?: { silent?: boolean }): Promise<number> {
    const payload = overrideForm ?? form;
    if (savedId) {
      await updateIdea(savedId, payload, options?.silent ? { silent: true } : undefined);
      return savedId;
    }
    const created = await createIdea(payload);
    setSavedId(created.id);
    return created.id;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      // Lưu nội dung không tự đổi trạng thái — trạng thái "Chờ đăng" chỉ được xác nhận qua nút "Sẵn sàng đăng" ở màn xem trước.
      const id = await ensureSaved(form);
      onSaved();
      if (onSavedContent) {
        onSavedContent(id);
      } else {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(files: File[] | null, kind: AssetKind, platform: AssetPlatform) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const id = await ensureSaved(undefined, { silent: true });
      const added = await uploadAssets(id, files, kind, platform);
      setAssets((a) => [...a, ...added]);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAsset(a: Asset) {
    await deleteAsset(a.id);
    setAssets((list) => list.filter((x) => x.id !== a.id));
    onSaved();
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";
  const labelCls = "mb-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[97vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${mode === "content" ? "max-w-7xl" : "max-w-3xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
            {mode === "content" ? (
              <>
                <PenLine className="h-5 w-5 text-zinc-900" /> Viết nội dung
              </>
            ) : idea ? (
              <>
                <Pencil className="h-5 w-5 text-zinc-900" /> Sửa ý tưởng
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-zinc-900" /> Thêm ý tưởng mới
              </>
            )}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "idea" && (
          <div className="grid min-h-[460px] grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>
                  <CalendarDays className="h-3.5 w-3.5" /> Ngày đăng *
                </label>
                <input type="date" value={form.post_date} onChange={set("post_date")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  <Tag className="h-3.5 w-3.5" /> Chuyên mục
                </label>
                <select value={form.category} onChange={set("category")} className={inputCls}>
                  <option value="">— Chọn chuyên mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  <ImagePlus className="h-3.5 w-3.5" /> Dạng bài viết
                </label>
                <select value={form.post_format} onChange={set("post_format")} className={inputCls}>
                  {(Object.keys(POST_FORMAT_LABELS) as PostFormat[]).map((f) => (
                    <option key={f} value={f}>
                      {POST_FORMAT_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                <Lightbulb className="h-3.5 w-3.5" /> Ý tưởng bài viết
              </label>
              <textarea
                rows={6}
                placeholder="Viết theo giọng tự nhiên…"
                value={form.content}
                onChange={set("content")}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                <Paperclip className="h-3.5 w-3.5" /> Asset cần chuẩn bị
              </label>
              <textarea
                rows={3}
                placeholder="VD: 3 ảnh sản phẩm, 1 video ngắn 15s…"
                value={form.asset_note}
                onChange={set("asset_note")}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                <Clock className="h-3.5 w-3.5" /> Giờ đăng theo từng nền tảng
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TIME_FIELDS.map((p, idx) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900"
                  >
                    <span className="flex items-center gap-1.5 text-sm text-zinc-600">
                      <TimePlatformIcon platform={p.platform} />
                      {p.label}
                    </span>
                    <TimeHM
                      value={form[p.key]}
                      onChange={(v) => setTimeValue(p.key, v)}
                      hourRef={(el) => (timeHourRefs.current[idx] = el)}
                      onComplete={() => timeHourRefs.current[idx + 1]?.focus()}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chỉ hiện khi đang sửa nội dung (Viết nội dung): 2 cột — trái viết nội dung + ảnh, phải demo */}
        {mode === "content" && idea && (() => {
          const previewIdea: Idea = { ...idea, ...form, content: form.detail_content || form.content, assets };
          return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={labelCls}>Nội dung chi tiết</label>
                  {autoSaving && <span className="text-[11px] text-zinc-400">Đang tự động lưu…</span>}
                </div>
                <textarea
                  rows={16}
                  placeholder="Viết caption đầy đủ khi ý tưởng được triển khai… (mẹo: chèn --- ở nơi muốn tách xuống comment cho Threads, vd: ...---Mình sẽ ưu tiên theo thứ tự này.)"
                  value={form.detail_content}
                  onChange={set("detail_content")}
                  className={inputCls}
                />

                <div className="mt-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                    <Paperclip className="h-3.5 w-3.5" />
                    Ảnh đăng theo từng nền tảng
                  </p>

                  <AssetUploadZone
                    label="Ảnh Facebook"
                    // hint="FB linh hoạt tỉ lệ (ngang 1.91:1 hoặc vuông), không dùng chung kích thước với IG/Threads"
                    accent="bg-zinc-900 hover:bg-zinc-700"
                    assets={assets.filter((a) => a.kind === "image" && a.platform === "fb")}
                    onUpload={(files) => handleUpload(files, "image", "fb")}
                    onDelete={handleDeleteAsset}
                  />

                  <AssetUploadZone
                    label="Ảnh Instagram & Threads"
                    // hint="IG và Threads dùng chung kích thước (khuyên dùng vuông 1:1 hoặc 4:5)"
                    accent="bg-zinc-700 hover:bg-zinc-600"
                    assets={assets.filter((a) => a.kind === "image" && a.platform === "ig_threads")}
                    onUpload={(files) => handleUpload(files, "image", "ig_threads")}
                    onDelete={handleDeleteAsset}
                  />

                  {uploading && <span className="text-xs text-zinc-500">Đang tải lên…</span>}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Demo bài đăng trên từng nền tảng
                </p>
                <PlatformDemo idea={previewIdea} assets={assets} />
              </div>
            </div>
          );
        })()}

        {error && <p className="mt-3 text-sm text-zinc-900">⚠ {error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            {mode === "content" ? "Đóng" : "Huỷ"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : mode === "content" ? "Lưu nội dung" : "Lưu ý tưởng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetUploadZone({
  label,
  hint,
  accent,
  accept = "image/*",
  icon: Icon = ImagePlus,
  assets,
  onUpload,
  onDelete,
}: {
  label: string;
  hint?: string;
  accent: string;
  accept?: string;
  icon?: typeof ImagePlus;
  assets: Asset[];
  onUpload: (files: File[] | null) => void;
  onDelete: (asset: Asset) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-700">{label}</p>
          {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
        </div>
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${accent}`}
        >
          <Icon className="h-3.5 w-3.5" /> Tải lên
          <input
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : null;
              e.target.value = "";
              onUpload(files);
            }}
          />
        </label>
      </div>
      {assets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {assets.map((a) => (
            <div key={a.id} className="group relative">
              {isVideo(a) ? (
                <video src={assetUrl(a)} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <img src={assetUrl(a)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <button
                onClick={() => onDelete(a)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
