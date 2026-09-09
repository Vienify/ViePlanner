import "server-only";
import { db } from "@/lib/server/db";
import type { NotificationType } from "@/lib/api";

function formatVNDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Chuỗi mô tả ý tưởng: [Danh mục] “nội dung…” (lịch đăng dd/mm/yyyy) */
export function ideaRef(idea: {
  id?: number;
  content?: string | null;
  category?: string | null;
  post_date?: string | null;
}): string {
  const title = (idea.content || "").trim();
  const short = title.length > 60 ? `${title.slice(0, 60)}…` : title;
  const parts: string[] = [];
  if (idea.category) parts.push(`[${idea.category}]`);
  if (short) parts.push(`“${short}”`);
  else if (idea.id) parts.push(`#${idea.id}`);
  if (idea.post_date) parts.push(`(lịch đăng ${formatVNDate(idea.post_date)})`);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

export async function createNotification(
  type: NotificationType,
  message: string,
  opts?: { ideaId?: number | null; actorName?: string | null }
): Promise<void> {
  await db.from("notifications").insert({
    type,
    message,
    idea_id: opts?.ideaId ?? null,
    actor_name: opts?.actorName ?? null,
  });
}
