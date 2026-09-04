import { NextResponse } from "next/server";

// Token đăng nhập là JWT stateless lưu ở localStorage phía client, nên server
// không cần lưu/xoá gì thêm — endpoint này chỉ để tương thích với lib/api.ts.
export async function POST() {
  return NextResponse.json({ ok: true });
}
