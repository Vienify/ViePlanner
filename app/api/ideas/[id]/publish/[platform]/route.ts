import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createNotification, ideaRef } from "@/lib/server/notify";
import { publishToPlatform } from "@/lib/server/social";
import type { Idea, SocialPlatform } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; platform: string }> };

const POST_ID_FIELD: Record<SocialPlatform, "fb_post_id" | "ig_post_id" | "threads_post_id"> = {
  facebook: "fb_post_id",
  instagram: "ig_post_id",
  threads: "threads_post_id",
};

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};

function isSocialPlatform(v: string): v is SocialPlatform {
  return v === "facebook" || v === "instagram" || v === "threads";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id, platform } = await ctx.params;
  if (!isSocialPlatform(platform)) {
    return NextResponse.json({ error: "Nền tảng không hợp lệ" }, { status: 400 });
  }

  const { data: idea, error: findError } = await db
    .from("ideas")
    .select("*, assets(*)")
    .eq("id", id)
    .single();
  if (findError || !idea) return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });

  let postId: string;
  try {
    postId = await publishToPlatform(idea as Idea, platform);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Đăng bài thất bại" }, { status: 502 });
  }

  const { data: updated, error: updateError } = await db
    .from("ideas")
    .update({ [POST_ID_FIELD[platform]]: postId, status: "posted", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, assets(*)")
    .single();
  if (updateError || !updated) return NextResponse.json({ error: "Đăng thành công nhưng lỗi cập nhật" }, { status: 500 });

  await createNotification("idea_publish", `đã đăng lên ${PLATFORM_LABEL[platform]} ý tưởng${ideaRef(updated)}`, {
    ideaId: updated.id,
    actorName: user.name,
  });

  return NextResponse.json(updated);
}
