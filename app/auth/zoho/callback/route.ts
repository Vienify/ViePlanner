import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { signToken } from "@/lib/server/auth";
import { createNotification } from "@/lib/server/notify";
import { exchangeZohoCode, fetchZohoUserInfo, lookupLocation } from "@/lib/server/zoho";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN;

function loginRedirect(errorCode: string): NextResponse {
  return NextResponse.redirect(`${FRONTEND_URL}/login?error=${errorCode}`);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) return loginRedirect("access_denied");

  const cookieState = req.cookies.get("zoho_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return loginRedirect("invalid_state");
  }

  let accessToken: string;
  try {
    accessToken = await exchangeZohoCode(code);
  } catch {
    return loginRedirect("token_failed");
  }

  let info;
  try {
    info = await fetchZohoUserInfo(accessToken);
  } catch {
    return loginRedirect("userinfo_failed");
  }

  if (ALLOWED_EMAIL_DOMAIN && !info.email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN.toLowerCase()}`)) {
    return loginRedirect("domain_not_allowed");
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const device = req.headers.get("user-agent") || null;
    const location = await lookupLocation(ip);

    const { data: existing } = await db
      .from("users")
      .select("*")
      .or(`zoho_id.eq.${info.zohoId},email.eq.${info.email}`)
      .maybeSingle();

    const now = new Date().toISOString();
    let user;
    if (existing) {
      const { data } = await db
        .from("users")
        .update({
          email: info.email,
          name: info.name,
          zoho_id: info.zohoId,
          last_login: now,
          last_login_ip: ip,
          last_login_device: device,
          last_login_location: location,
        })
        .eq("id", existing.id)
        .select()
        .single();
      user = data;
    } else {
      const { data } = await db
        .from("users")
        .insert({
          email: info.email,
          name: info.name,
          zoho_id: info.zohoId,
          last_login: now,
          last_login_ip: ip,
          last_login_device: device,
          last_login_location: location,
        })
        .select()
        .single();
      user = data;
    }

    if (!user) return loginRedirect("server_error");

    await createNotification("login", "đã đăng nhập", { actorName: user.name });

    const token = signToken(user);
    const res = NextResponse.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(token)}`);
    res.cookies.delete("zoho_oauth_state");
    return res;
  } catch {
    return loginRedirect("server_error");
  }
}
