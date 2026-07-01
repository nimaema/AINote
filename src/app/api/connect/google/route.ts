import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

// Starts the Google OAuth flow.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?error=google_not_configured", process.env.APP_URL)
    );
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: (process.env.APP_URL ?? "").startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
