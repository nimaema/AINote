import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { microsoftAuthUrl, microsoftConfigured } from "@/lib/microsoft";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  if (!microsoftConfigured()) {
    return NextResponse.redirect(new URL("/settings?error=ms_not_configured", process.env.APP_URL));
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(microsoftAuthUrl(state));
  res.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: (process.env.APP_URL ?? "").startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
