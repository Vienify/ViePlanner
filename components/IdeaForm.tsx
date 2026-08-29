"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, ImagePlus, Lightbulb, MonitorPlay, Paperclip, Pencil, PenLine, Sparkles, Tag, X } from "lucide-react";
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

interface Props {
  idea?: Idea | null; // null = tạo mới
  defaultDate?: string;
  initialMode?: "idea" | "content"; // chỉ áp dụng khi đang sửa ý tưởng có sẵn
  onClose: () => void;
  onSaved: () => void;
}

export default function IdeaForm({ idea, defaultDate, initialMode, onClose, onSaved }: Props) {
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
      updateIdea(savedId, form)
        .then(() => onSaved())
        .catch(() => {})
        .finally(() => setAutoSaving(false));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.detail_content, mode, savedId]);

  const set = (k: keyof IdeaInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function ensureSaved(overrideForm?: IdeaInput): Promise<number> {
    const payload = overrideForm ?? form;
    if (savedId) {
      await updateIdea(savedId, payload);
      return savedId;
    }
    const created = await createIdea(payload);
    setSavedId(created.id);
    return created.id;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      // Lưu nội dung không tự đổi trạng thái — trạng thái "Chờ đăng" chỉ được xác nhận qua nút "Sẵn sàng đăng" ở màn xem trước.
      await ensureSaved(form);
      onSaved();
      onClose();
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
      const id = await ensureSaved();
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
              <div className="grid grid-cols-3 gap-4">
                <input type="time" value={form.time_fb} onChange={set("time_fb")} className={inputCls} title="Giờ đăng Facebook" />
                <input type="time" value={form.time_ig} onChange={set("time_ig")} className={inputCls} title="Giờ đăng Instagram" />
                <input
                  type="time"
                  value={form.time_threads}
                  onChange={set("time_threads")}
                  className={inputCls}
                  title="Giờ đăng Threads"
                />
              </div>
              <div className="mt-1 grid grid-cols-3 gap-4 text-center text-[11px] text-zinc-400">
                <span>Facebook</span>
                <span>Instagram</span>
                <span>Threads</span>
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
