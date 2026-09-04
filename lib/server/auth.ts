import "server-only";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import type { User } from "@/lib/api";

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Thiếu biến môi trường JWT_SECRET. Kiểm tra file .env.");
}
const SECRET: string = JWT_SECRET;

export interface TokenPayload {
  sub: number;
  email: string;
  name: string;
}

export function signToken(user: Pick<User, "id" | "email" | "name">): string {
  const payload: TokenPayload = { sub: user.id, email: user.email, name: user.name };
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Trả về user hiện tại (từ bảng users) nếu token hợp lệ, ngược lại null. */
export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, SECRET) as unknown as TokenPayload;
  } catch {
    return null;
  }
  const { data, error } = await db.from("users").select("*").eq("id", payload.sub).single();
  if (error || !data) return null;
  return data as User;
}
