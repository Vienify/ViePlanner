import "server-only";
import { db } from "@/lib/server/db";
import type { NotificationType } from "@/lib/api";

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
