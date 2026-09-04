import "server-only";
import { randomBytes } from "crypto";

const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;

export interface ZohoUserInfo {
  zohoId: string;
  email: string;
  name: string;
}

export function assertZohoConfigured(): void {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REDIRECT_URI) {
    throw new Error("Thiếu cấu hình ZOHO_CLIENT_ID/ZOHO_CLIENT_SECRET/ZOHO_REDIRECT_URI trong .env");
  }
}

export function newState(): string {
  return randomBytes(16).toString("hex");
}

export function buildZohoAuthorizeUrl(state: string): string {
  assertZohoConfigured();
  const params = new URLSearchParams({
    scope: "AaaServer.profile.Read",
    client_id: ZOHO_CLIENT_ID!,
    response_type: "code",
    access_type: "online",
    redirect_uri: ZOHO_REDIRECT_URI!,
    prompt: "consent",
    state,
  });
  return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeZohoCode(code: string): Promise<string> {
  assertZohoConfigured();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: ZOHO_CLIENT_ID!,
    client_secret: ZOHO_CLIENT_SECRET!,
    redirect_uri: ZOHO_REDIRECT_URI!,
    code,
  });
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body.error || "token_failed");
  }
  return body.access_token as string;
}

export async function fetchZohoUserInfo(accessToken: string): Promise<ZohoUserInfo> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/user/info`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  const email = body.Email as string | undefined;
  if (!res.ok || !email) {
    throw new Error("userinfo_failed");
  }
  return {
    zohoId: String(body.ZUID ?? ""),
    email,
    name: (body.Display_Name as string) || email,
  };
}

/** Tra cứu vị trí gần đúng theo IP (best-effort, không chặn luồng đăng nhập nếu lỗi). */
export async function lookupLocation(ip: string | null): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    const parts = [body.city, body.region, body.country_name].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}
