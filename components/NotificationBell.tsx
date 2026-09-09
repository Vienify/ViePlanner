"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle2, LogIn, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { AppNotification, NOTIFICATIONS_CHANGED_EVENT, NotificationType, fetchNotifications } from "@/lib/api";

const LAST_SEEN_KEY = "vieplanner_last_seen_notification";
const POLL_MS = 8000;
const TOAST_MS = 6000;

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  login: LogIn,
  idea_create: Plus,
  idea_update: Pencil,
  idea_ready: CheckCircle2,
  idea_delete: Trash2,
  idea_publish: Send,
};

function timeAgoVN(iso: string): string {
  const diffMs = Date.now() - new Date(iso.replace(" ", "T")).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  return `${day} ngày trước`;
}

function exactTimeVN(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mi} ngày ${dd}/${mm}/${d.getFullYear()}`;
}

function dayKey(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabelVN(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return "Hôm nay";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function NotificationText({ n }: { n: AppNotification }) {
  return (
    <span className="block text-sm text-zinc-800">
      {n.actor_name && <span className="font-semibold">{n.actor_name} </span>}
      {n.message}
    </span>
  );
}

export default function NotificationBell({
  onOpenIdea,
}: {
  onOpenIdea: (ideaId: number) => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const maxIdRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLastSeen(Number(localStorage.getItem(LAST_SEEN_KEY) || 0));
    const load = () => {
      fetchNotifications()
        .then((data) => {
          setItems(data);
          if (!initializedRef.current) {
            initializedRef.current = true;
            maxIdRef.current = data[0]?.id || 0;
            return;
          }
          const fresh = data.filter((n) => n.id > maxIdRef.current);
          if (fresh.length > 0) {
            maxIdRef.current = Math.max(maxIdRef.current, ...fresh.map((n) => n.id));
            setToasts((prev) => [...fresh, ...prev].slice(0, 5));
            for (const n of fresh) {
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== n.id));
              }, TOAST_MS);
            }
          }
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    return () => {
      clearInterval(id);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next && items.length > 0) {
        setLastSeen(items[0].id);
        localStorage.setItem(LAST_SEEN_KEY, String(items[0].id));
      }
      return next;
    });
  }

  const unreadCount = items.filter((n) => n.id > lastSeen).length;

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        title="Thông báo"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-base font-semibold text-zinc-900">Thông báo hệ thống</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-zinc-400">Chưa có thông báo nào.</p>
              ) : (
                items.map((n, idx) => {
                  const Icon = TYPE_ICON[n.type] || Bell;
                  const showDayHeader = idx === 0 || dayKey(n.created_at) !== dayKey(items[idx - 1].created_at);
                  return (
                    <div key={n.id}>
                      {showDayHeader && (
                        <div className="sticky top-0 z-10 bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-500">
                          {dayLabelVN(n.created_at)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (n.idea_id) onOpenIdea(n.idea_id);
                          setOpen(false);
                        }}
                        disabled={!n.idea_id}
                        className="flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <NotificationText n={n} />
                          <span className="mt-0.5 block text-xs text-zinc-400">
                            {exactTimeVN(n.created_at)} · {timeAgoVN(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {mounted && toasts.length > 0 && createPortal(
        <div className="fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            return (
              <div
                key={n.id}
                role="button"
                onClick={() => {
                  if (n.idea_id) onOpenIdea(n.idea_id);
                  dismissToast(n.id);
                }}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <NotificationText n={n} />
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {exactTimeVN(n.created_at)} · {timeAgoVN(n.created_at)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(n.id);
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
