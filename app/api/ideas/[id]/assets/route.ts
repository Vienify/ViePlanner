import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { uploadFileToR2 } from "@/lib/server/r2";
import type { AssetKind, AssetPlatform } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await ctx.params;
  const ideaId = Number(id);

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const kind = (form.get("kind") as AssetKind) || "image";
  const platform = (form.get("platform") as AssetPlatform) || "general";

  if (files.length === 0) return NextResponse.json({ error: "Không có file nào" }, { status: 400 });

  const inserted: unknown[] = [];
  for (const file of files) {
    const { url } = await uploadFileToR2(ideaId, file);
    const { data, error } = await db
      .from("assets")
      .insert({ idea_id: ideaId, file_path: url, original_name: file.name, kind, platform })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted.push(data);
  }

  return NextResponse.json(inserted);
}
