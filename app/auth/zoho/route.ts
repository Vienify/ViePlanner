import { NextResponse } from "next/server";
import { buildZohoAuthorizeUrl, newState } from "@/lib/server/zoho";

export async function GET() {
  const state = newState();
  const url = buildZohoAuthorizeUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("zoho_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return res;
}
