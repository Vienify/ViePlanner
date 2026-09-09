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
import type { Platform } from "@/components/platform-previews/shared";

const CONTENT_TABS: { key: Platform; field: "detail_fb" | "detail_ig" | "detail_threads"; label: string }[] = [
  { key: "facebook", field: "detail_fb", label: "Facebook" },
  { key: "instagram", field: "detail_ig", label: "Instagram" },
  { key: "threads", field: "detail_threads", label: "Threads" },
];

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
// - Cho phép dán (paste) một chuỗi giờ đầy đủ (VD "14:30", "1430") vào 1 trong 2 ô.
//
// Lưu ý kỹ thuật: khi gõ xong giờ (2 số) ta gọi minuteRef.current?.focus() để nhảy ô —
// việc focus() này kích hoạt sự kiện blur đồng bộ trên ô giờ NGAY LẬP TỨC, tức là trước khi
// React kịp render lại với giá trị "h" mới vừa setH(). Nếu để onBlur luôn chạy finalize(h, m)
// thì nó sẽ đọc closure "h/m" CŨ (trước khi gõ số thứ 2) và ghi đè mất giá trị vừa nhập —
// đây chính là lý do các giờ 2 chữ số (10-23) bị "nuốt" mất chữ số thứ 2. Dùng cờ
// skipNextBlur để bỏ qua đúng 1 lần finalize khi blur đó là do chính ta chủ động focus() sang.
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
  const skipNextBlur = useRef(false);

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

  function handleBlur() {
    if (skipNextBlur.current) {
      skipNextBlur.current = false;
      return;
    }
    finalize(h, m);
  }

  // Nhận diện chuỗi giờ dán vào, hỗ trợ "14:30", "14.30", "14h30", "1430", "430".
  function parsePastedTime(text: string): { h: string; m: string } | null {
    const trimmed = text.trim();
    const sep = trimmed.match(/^(\d{1,2})\D+(\d{1,2})$/);
    let hourPart: string | undefined;
    let minutePart: string | undefined;
    if (sep) {
      [, hourPart, minutePart] = sep;
    } else {
      const raw = trimmed.match(/^(\d{3,4})$/);
      if (raw) {
        const digits = raw[1];
        hourPart = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
        minutePart = digits.length === 3 ? digits.slice(1) : digits.slice(2);
      }
    }
    if (hourPart === undefined || minutePart === undefined) return null;
    const hh = Math.min(23, Math.max(0, Number(hourPart)));
    const mm = Math.min(59, Math.max(0, Number(minutePart)));
    return { h: String(hh).padStart(2, "0"), m: String(mm).padStart(2, "0") };
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const parsed = parsePastedTime(e.clipboardData.getData("text"));
    if (!parsed) return; // không nhận diện được dạng giờ -> để trình duyệt dán số bình thường vào 1 ô
    e.preventDefault();
    setH(parsed.h);
    setM(parsed.m);
    commit(parsed.h, parsed.m);
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
        onPaste={handlePaste}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = digits.length === 2 && Number(digits) > 23 ? "23" : digits;
          setH(clamped);
          commit(clamped, m);
          if (clamped.length === 2) {
            skipNextBlur.current = true;
            minuteRef.current?.focus();
            minuteRef.current?.select();
          }
        }}
        onBlur={handleBlur}
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
        onPaste={handlePaste}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const clamped = digits.length === 2 && Number(digits) > 59 ? "59" : digits;
          setM(clamped);
          commit(h, clamped);
          if (clamped.length === 2) {
            skipNextBlur.current = true;
            onComplete?.();
          }
        }}
        onBlur={handleBlur}
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
    detail_fb: idea?.detail_fb || idea?.detail_content || "",
    detail_ig: idea?.detail_ig || idea?.detail_content || "",
    detail_threads: idea?.detail_threads || idea?.detail_content || "",
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
  const [contentTab, setContentTab] = useState<Platform>("facebook");

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
  }, [form.detail_fb, form.detail_ig, form.detail_threads, mode, savedId]);

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

        {/* Chỉ hiện khi đang sửa nội dung (Viết nội dung): 2 cột — trái viết nội dung theo từng nền tảng + ảnh, phải demo tương ứng */}
        {mode === "content" && idea && (() => {
          const previewIdea: Idea = { ...idea, ...form, assets };
          const activeTab = CONTENT_TABS.find((t) => t.key === contentTab)!;
          return (
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <div className="flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <label className={`${labelCls} !mb-0`}>Nội dung chi tiết theo nền tảng</label>
                  {autoSaving && <span className="text-[11px] text-zinc-400">Đang tự động lưu…</span>}
                </div>
                <div className="mb-3 flex min-h-9 flex-wrap items-center gap-2">
                  {CONTENT_TABS.map((t) => {
                    const filled = Boolean(form[t.field].trim());
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setContentTab(t.key)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                          contentTab === t.key
                            ? "bg-zinc-900 text-white"
                            : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        <TimePlatformIcon platform={t.key} />
                        {t.label}
                        {filled && <span className={`h-1.5 w-1.5 rounded-full ${contentTab === t.key ? "bg-emerald-400" : "bg-emerald-500"}`} />}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  key={activeTab.key}
                  rows={12}
                  placeholder={
                    activeTab.key === "threads"
                      ? "Viết caption cho Threads… (mẹo: chèn --- ở nơi muốn tách xuống comment, vd: ...---Mình sẽ ưu tiên theo thứ tự này.)"
                      : `Viết caption đầy đủ cho ${activeTab.label}…`
                  }
                  value={form[activeTab.field]}
                  onChange={set(activeTab.field)}
                  className={`${inputCls} min-h-[18rem] flex-1 resize-none`}
                />

                <div className="mt-4 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                    <Paperclip className="h-3.5 w-3.5" />
                    Ảnh đăng cho {activeTab.label}
                  </p>

                  {contentTab === "facebook" && (
                    <AssetUploadZone
                      label="Ảnh Facebook"
                      accent="bg-zinc-900 hover:bg-zinc-700"
                      assets={assets.filter((a) => a.kind === "image" && a.platform === "fb")}
                      onUpload={(files) => handleUpload(files, "image", "fb")}
                      onDelete={handleDeleteAsset}
                    />
                  )}

                  {contentTab === "instagram" && (
                    <AssetUploadZone
                      label="Ảnh Instagram"
                      accent="bg-zinc-700 hover:bg-zinc-600"
                      assets={assets.filter((a) => a.kind === "image" && (a.platform === "ig" || a.platform === "ig_threads"))}
                      onUpload={(files) => handleUpload(files, "image", "ig")}
                      onDelete={handleDeleteAsset}
                    />
                  )}

                  {contentTab === "threads" && (
                    <AssetUploadZone
                      label="Ảnh Threads"
                      accent="bg-zinc-700 hover:bg-zinc-600"
                      assets={assets.filter((a) => a.kind === "image" && (a.platform === "threads" || a.platform === "ig_threads"))}
                      onUpload={(files) => handleUpload(files, "image", "threads")}
                      onDelete={handleDeleteAsset}
                    />
                  )}

                  {uploading && <span className="text-xs text-zinc-500">Đang tải lên…</span>}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Demo bài đăng trên từng nền tảng
                </p>
                <PlatformDemo idea={previewIdea} assets={assets} platform={contentTab} onPlatformChange={setContentTab} />
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
