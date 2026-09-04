import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { deleteFileFromR2 } from "@/lib/server/r2";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const { data: asset, error: findError } = await db.from("assets").select("*").eq("id", id).single();
  if (findError || !asset) return NextResponse.json({ error: "Không tìm thấy file" }, { status: 404 });

  await deleteFileFromR2(asset.file_path).catch(() => {});

  const { error } = await db.from("assets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
