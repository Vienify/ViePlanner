import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { fetchSocialAccounts } from "@/lib/server/social";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const accounts = await fetchSocialAccounts();
  return NextResponse.json(accounts);
}
