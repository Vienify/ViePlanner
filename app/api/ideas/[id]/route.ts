import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createNotification } from "@/lib/server/notify";
import type { IdeaInput } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const { data, error } = await db.from("ideas").select("*, assets(*)").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Không tìm thấy ý tưởng" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const silent = req.nextUrl.searchParams.get("silent") === "1";
  const body = (await req.json().catch(() => null)) as Partial<IdeaInput> | null;
  if (!body) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const { data: before } = await db.from("ideas").select("status").eq("id", id).single();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of [
    "post_date",
    "category",
    "post_format",
    "content",
    "detail_content",
    "asset_note",
    "time_fb",
    "time_ig",
    "time_threads",
    "status",
  ] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const { data, error } = await db
    .from("ideas")
    .update(update)
    .eq("id", id)
    .select("*, assets(*)")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Không cập nhật được" }, { status: 500 });

  if (!silent) {
    if (before && before.status !== "scheduled" && data.status === "scheduled") {
      await createNotification("idea_ready", "đã đánh dấu sẵn sàng đăng", { ideaId: data.id, actorName: user.name });
    } else {
      await createNotification("idea_update", "đã cập nhật ý tưởng", { ideaId: data.id, actorName: user.name });
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await db.from("ideas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createNotification("idea_delete", "đã xoá ý tưởng", { actorName: user.name });

  return NextResponse.json({ ok: true });
}
