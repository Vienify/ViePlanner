"use client";

import { useState } from "react";
import { Pencil, Play, Search, Trash2, X } from "lucide-react";
import {
  Idea,
  IdeaStatus,
  POST_FORMAT_ICONS,
  POST_FORMAT_LABELS,
  PostFormat,
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  assetUrl,
  formatDateVN,
  isVideo,
  weekdayVN,
} from "@/lib/api";

interface Props {
  ideas: Idea[];
  onSelect: (idea: Idea) => void;
  onEdit: (idea: Idea) => void;
  onDelete: (idea: Idea) => void;
}

function matchesSearch(idea: Idea, q: string): boolean {
  const haystack = [
    formatDateVN(idea.post_date),
    weekdayVN(idea.post_date),
    idea.category,
    POST_FORMAT_LABELS[idea.post_format],
    idea.content,
    idea.detail_content,
    idea.detail_fb,
    idea.detail_ig,
    idea.detail_threads,
    idea.asset_note,
    idea.time_fb,
    idea.time_ig,
    idea.time_threads,
    STATUS_LABELS[idea.status],
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export default function TableView({ ideas, onSelect, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterFormat, setFilterFormat] = useState<PostFormat | "">("");
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | "">("");

  const categoryOptions = Array.from(new Set(ideas.map((i) => i.category).filter(Boolean))).sort();
  const hasFilter = Boolean(search || filterCategory || filterFormat || filterStatus);

  const filteredIdeas = ideas
    .filter((i) => {
      if (filterCategory && i.category !== filterCategory) return false;
      if (filterFormat && i.post_format !== filterFormat) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      if (search && !matchesSearch(i, search)) return false;
      return true;
    })
    .sort((a, b) => a.post_date.localeCompare(b.post_date) || a.id - b.id);

  function resetFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterFormat("");
    setFilterStatus("");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm trong bảng…"
            className="rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Tất cả chuyên mục</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterFormat}
          onChange={(e) => setFilterFormat(e.target.value as PostFormat | "")}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Tất cả dạng bài</option>
          {(Object.keys(POST_FORMAT_LABELS) as PostFormat[]).map((f) => (
            <option key={f} value={f}>
              {POST_FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as IdeaStatus | "")}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(STATUS_LABELS) as IdeaStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Xoá lọc
          </button>
        )}
        <span className="ml-auto text-sm text-zinc-400">
          {filteredIdeas.length} / {ideas.length} ý tưởng
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-[1000px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-3">#</th>
            <th className="px-3 py-3">Ngày đăng</th>
            <th className="px-3 py-3">Thứ</th>
            <th className="px-3 py-3">Chuyên mục</th>
            <th className="px-3 py-3">Dạng bài</th>
            <th className="px-3 py-3">Hình ảnh / Asset</th>
            <th className="px-3 py-3">Giờ FB</th>
            <th className="px-3 py-3">Giờ IG</th>
            <th className="px-3 py-3">Giờ Threads</th>
            <th className="px-3 py-3">Trạng thái</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {filteredIdeas.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-10 text-center text-zinc-400">
                {ideas.length === 0
                  ? "Chưa có ý tưởng nào. Bấm “+ Thêm ý tưởng” để bắt đầu!"
                  : "Không có ý tưởng nào khớp với bộ lọc."}
              </td>
            </tr>
          )}
          {filteredIdeas.map((idea, idx) => (
            <tr
              key={idea.id}
              className="cursor-pointer border-b border-zinc-100 align-top transition hover:bg-zinc-50"
              onClick={() => onSelect(idea)}
            >
              <td className="px-3 py-3 text-zinc-400">{idx + 1}</td>
              <td className="px-3 py-3 whitespace-nowrap font-medium">
                {formatDateVN(idea.post_date)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{weekdayVN(idea.post_date)}</td>
              <td className="px-3 py-3">
                <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-bold text-zinc-700">
                  {idea.category || "—"}
                </span>
              </td>
              <td className="px-3 py-3">
                {(() => {
                  const FormatIcon = POST_FORMAT_ICONS[idea.post_format];
                  return (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-zinc-600">
                      <FormatIcon className="h-3.5 w-3.5" /> {POST_FORMAT_LABELS[idea.post_format]}
                    </span>
                  );
                })()}
              </td>
              <td className="px-3 py-3">
                {idea.assets.length > 0 ? (
                  <div className="flex gap-1">
                    {idea.assets.slice(0, 3).map((a) =>
                      isVideo(a) ? (
                        <span
                          key={a.id}
                          className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 text-white"
                        >
                          <Play className="h-3 w-3" />
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={a.id}
                          src={assetUrl(a)}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      )
                    )}
                    {idea.assets.length > 3 && (
                      <span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-500">
                        +{idea.assets.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 line-clamp-2">{idea.asset_note}</div>
                )}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-800">{idea.time_fb || "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-800">{idea.time_ig || "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap text-zinc-800">
                {idea.time_threads || "—"}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                {(() => {
                  const StatusIcon = STATUS_ICONS[idea.status];
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[idea.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_LABELS[idea.status]}
                    </span>
                  );
                })()}
              </td>
              <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(idea)}
                  className="mr-2 inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Sửa
                </button>
                <button
                  onClick={() => onDelete(idea)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
