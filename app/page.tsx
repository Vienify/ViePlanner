"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Table2,
  TriangleAlert,
} from "lucide-react";
import {
  Idea,
  STATUS_LABELS,
  User,
  deleteIdea,
  fetchIdeas,
  fetchMe,
  formatDateVN,
  logout,
  saveToken,
  weekdayVN,
} from "@/lib/api";
import CalendarView from "@/components/CalendarView";
import TableView from "@/components/TableView";
import IdeaForm from "@/components/IdeaForm";
import PreviewModal from "@/components/PreviewModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SiFacebook, SiInstagram, SiThreads } from "react-icons/si";

type ViewMode = "calendar" | "table";

function currentMonth(): string {
  return new Date().toLocaleDateString("sv-SE").slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

function defaultDateForMonth(month: string): string {
  if (month === currentMonth()) return new Date().toLocaleDateString("sv-SE");
  return `${month}-01`;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState<ViewMode>("calendar");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState<Idea | null>(null);
  const [editing, setEditing] = useState<Idea | null>(null);
  const [formMode, setFormMode] = useState<"idea" | "content">("content");
  const [showForm, setShowForm] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<Idea | null>(null);
  const [tomorrowIdeas, setTomorrowIdeas] = useState<Idea[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await fetchIdeas();
      setIdeas(data);
      setPreview((p) => (p ? data.find((i) => i.id === p.id) ?? null : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không kết nối được backend");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTomorrow = useCallback(async () => {
    try {
      const tmr = tomorrowDate();
      const data = await fetchIdeas(tmr.slice(0, 7));
      setTomorrowIdeas(data.filter((i) => i.post_date === tmr));
    } catch {
    }
  }, []);

  useEffect(() => {
    // Sau khi đăng nhập Zoho, backend redirect về đây kèm ?token=... (vì
    // frontend/backend khác domain nên không dùng cookie được) — lưu token
    // vào localStorage rồi xoá khỏi URL.
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      saveToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchMe().then((me) => {
      if (!me) {
        router.replace("/login");
        return;
      }
      setUser(me);
      setAuthChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    load();
    loadTomorrow();
  }, [load, loadTomorrow, authChecked]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function openAdd(date?: string) {
    setEditing(null);
    setFormMode("idea");
    setDefaultDate(date || defaultDateForMonth(month));
    setShowForm(true);
  }

  function openEdit(idea: Idea, mode: "idea" | "content" = "content") {
    setPreview(null);
    setEditing(idea);
    setFormMode(mode);
    setShowForm(true);
  }

  async function handleDelete(idea: Idea) {
    setDeleting(idea);
  }

  async function confirmDelete() {
    if (!deleting) return;
    await deleteIdea(deleting.id);
    setDeleting(null);
    load();
    loadTomorrow();
  }

  const stats = {
    total: ideas.length,
    idea: ideas.filter((i) => i.status === "idea").length,
    posted: ideas.filter((i) => i.status === "posted").length,
    scheduled: ideas.filter((i) => i.status === "scheduled").length,
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        Đang kiểm tra đăng nhập…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-[80%] flex-wrap items-center gap-3 py-4">
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
            {/* <Image src="/Logo.png" alt="Vienify" width={40} height={40} className="h-10 w-10" /> */}
            Vienify Content Planner
            <span className="ml-1 flex items-center gap-2">
              <SiFacebook className="h-6 w-6 shrink-0 text-[#1877F2]" />
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <SiInstagram className="h-[55%] w-[55%] text-white" />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black">
                <SiThreads className="h-[55%] w-[55%] text-white" />
              </span>
            </span>
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => router.push("/settings")}
              title="Cài đặt tài khoản"
              className="rounded-lg px-2 py-1 text-right leading-tight hover:bg-zinc-100"
            >
              <p className="text-sm font-semibold text-zinc-800">{user?.name || "—"}</p>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </button>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[80%] flex-1 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white text-sm">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="px-3 py-1.5 hover:bg-zinc-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-32 text-center font-semibold text-zinc-700">{monthLabel(month)}</span>
            <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="px-3 py-1.5 hover:bg-zinc-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setMonth(currentMonth())}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Hôm nay
          </button>
          <div className="flex rounded-lg border border-zinc-300 bg-white p-0.5 text-sm">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 ${view === "calendar" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
            >
              <CalendarDays className="h-4 w-4" /> Lịch
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 ${view === "table" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
            >
              <Table2 className="h-4 w-4" /> Bảng
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            <span>Tổng: <b className="text-zinc-900">{stats.total}</b></span>
            <span className="h-4 w-px bg-zinc-300" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {STATUS_LABELS.idea}: <b className="text-zinc-900">{stats.idea}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {STATUS_LABELS.scheduled}: <b className="text-zinc-900">{stats.scheduled}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {STATUS_LABELS.posted}: <b className="text-zinc-900">{stats.posted}</b>
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => openAdd()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-700"
          >
            <Plus className="h-4 w-4" /> Thêm ý tưởng
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-800">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {error} — hãy kiểm tra backend đã chạy tại cổng 4000 và MySQL đang hoạt động.
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-zinc-400">Đang tải…</div>
        ) : view === "calendar" ? (
          <>
            <CalendarView month={month} ideas={ideas} onSelect={setPreview} onAddDate={openAdd} />

            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800">
                <CalendarDays className="h-4 w-4" /> Bài đăng ngày mai ({formatDateVN(tomorrowDate())} · {weekdayVN(tomorrowDate())})
              </h3>
              {tomorrowIdeas.length === 0 ? (
                <p className="text-sm text-zinc-400">Không có bài nào lên lịch cho ngày mai.</p>
              ) : (
                <ul className="space-y-2">
                  {tomorrowIdeas.map((idea) => {
                    const needsIdea = idea.status === "idea";
                    return (
                      <li key={idea.id}>
                        <button
                          onClick={() => setPreview(idea)}
                          className={`flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            needsIdea
                              ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {needsIdea && <TriangleAlert className="h-4 w-4 shrink-0 text-red-500" />}
                          <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-bold text-zinc-700">
                            {idea.category || "—"}
                          </span>
                          <span className="flex-1 truncate">{idea.content || "Chưa có nội dung"}</span>
                          {needsIdea && (
                            <span className="font-semibold whitespace-nowrap">Cần viết nội dung ngay!</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : (
          <TableView ideas={ideas} onSelect={setPreview} onEdit={openEdit} onDelete={handleDelete} />
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-[80%] flex-wrap items-center justify-between gap-2 py-4 text-xs text-zinc-400">
          <span>© {new Date().getFullYear()} Vienify Content Planner</span>
          <a
            href="https://www.vienify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-600 hover:underline"
          >
            www.vienify.com
          </a>
        </div>
      </footer>

      {preview && (
        <PreviewModal
          idea={preview}
          onClose={() => setPreview(null)}
          onEdit={openEdit}
          onUpdated={() => {
            load();
            loadTomorrow();
          }}
        />
      )}
      {showForm && (
        <IdeaForm
          idea={editing}
          defaultDate={defaultDate}
          initialMode={formMode}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            load();
            loadTomorrow();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`Xoá ý tưởng ngày ${deleting.post_date}?`}
          confirmLabel="Xoá"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
