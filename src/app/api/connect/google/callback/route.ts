import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { exchangeCode, emailFromIdToken } from "@/lib/google";
import { upsertIntegration } from "@/lib/integrations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = (await cookies()).get("g_oauth_state")?.value;

  const settings = new URL("/settings", process.env.APP_URL);
  if (!code || !state || state !== saved) {
    settings.searchParams.set("error", "google_oauth");
    return NextResponse.redirect(settings);
  }

  try {
    const tokens = await exchangeCode(code);
    const email = emailFromIdToken(tokens.id_token);
    await upsertIntegration(session.user.id, "google", {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      accountLabel: email,
      // Only overwrite the refresh token if Google sent a new one.
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    });
    settings.searchParams.set("connected", "google");
  } catch {
    settings.searchParams.set("error", "google_oauth");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("g_oauth_state");
  return res;
}
