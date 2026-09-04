import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createNotification } from "@/lib/server/notify";
import type { IdeaInput } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  let query = db.from("ideas").select("*, assets(*)").order("post_date");

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonth = new Date(y, m, 1); // m đã là tháng kế tiếp (0-indexed vs 1-indexed)
    const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
    query = query.gte("post_date", start).lt("post_date", end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Partial<IdeaInput> | null;
  if (!body || !body.post_date) {
    return NextResponse.json({ error: "Thiếu dữ liệu ý tưởng" }, { status: 400 });
  }

  const { data, error } = await db
    .from("ideas")
    .insert({
      post_date: body.post_date,
      category: body.category ?? "",
      post_format: body.post_format ?? "image",
      content: body.content ?? "",
      detail_content: body.detail_content ?? "",
      asset_note: body.asset_note ?? "",
      time_fb: body.time_fb ?? "",
      time_ig: body.time_ig ?? "",
      time_threads: body.time_threads ?? "",
      status: body.status ?? "idea",
      created_by: user.id,
    })
    .select("*, assets(*)")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Không tạo được ý tưởng" }, { status: 500 });

  await createNotification("idea_create", "đã tạo ý tưởng mới", { ideaId: data.id, actorName: user.name });

  return NextResponse.json(data);
}
