import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json(user);
}
