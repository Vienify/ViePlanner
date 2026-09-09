"use client";

import { Plus } from "lucide-react";
import { Idea, IdeaStatus } from "@/lib/api";

interface Props {
  month: string; // YYYY-MM
  ideas: Idea[];
  onSelect: (idea: Idea) => void;
  onAddDate: (date: string) => void;
}

const DOW_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const CALENDAR_STATUS_BORDER: Record<IdeaStatus, string> = {
  idea: "border border-red-300 bg-red-200 text-red-900",
  scheduled: "border border-amber-300 bg-amber-200 text-amber-900",
  posted: "border border-emerald-300 bg-emerald-200 text-emerald-900",
};

export default function CalendarView({ month, ideas, onSelect, onAddDate }: Props) {
  const [year, mon] = month.split("-").map(Number);
  const first = new Date(year, mon - 1, 1);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const todayStr = new Date().toLocaleDateString("sv-SE");

  const byDate = new Map<string, Idea[]>();
  for (const i of ideas) {
    if (!byDate.has(i.post_date)) byDate.set(i.post_date, []);
    byDate.get(i.post_date)!.push(i);
  }

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: { date: string; overflow: boolean }[] = Array.from({ length: totalCells }, (_, i) => {
    const dayOffset = i - startOffset;
    const d = new Date(year, mon - 1, 1 + dayOffset);
    return { date: d.toLocaleDateString("sv-SE"), overflow: dayOffset < 0 || dayOffset >= daysInMonth };
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
        {DOW_HEADERS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-zinc-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ date, overflow }, idx) => (
          <div
            key={idx}
            className={`group relative min-h-28 border-b border-r border-zinc-100 p-1.5 hover:bg-zinc-50 ${
              overflow ? "bg-zinc-50/50" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  date === todayStr ? "bg-zinc-900 text-white" : overflow ? "text-zinc-300" : "text-zinc-600"
                }`}
              >
                {Number(date.slice(8))}
              </span>
              <button
                onClick={() => onAddDate(date)}
                title="Thêm ý tưởng ngày này"
                className="hidden h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-900 hover:text-white group-hover:flex"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 space-y-1">
              {(byDate.get(date) || []).map((idea) => (
                <button
                  key={idea.id}
                  onClick={() => onSelect(idea)}
                  className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:shadow ${CALENDAR_STATUS_BORDER[idea.status]}`}
                  title={idea.content}
                >
                  <span className="font-bold">{idea.category || "Chưa phân mục"}</span>
                  <div className="truncate opacity-80">{idea.content}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
