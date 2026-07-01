import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { exchangeCode, me } from "@/lib/microsoft";
import { upsertIntegration } from "@/lib/integrations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = (await cookies()).get("ms_oauth_state")?.value;

  const settings = new URL("/settings", process.env.APP_URL);
  if (!code || !state || state !== saved) {
    settings.searchParams.set("error", "ms_oauth");
    return NextResponse.redirect(settings);
  }

  try {
    const tokens = await exchangeCode(code);
    let label: string | null = null;
    try {
      const profile = await me(tokens.access_token);
      label = profile.mail ?? profile.userPrincipalName ?? profile.displayName ?? null;
    } catch {
      /* profile is best-effort */
    }
    await upsertIntegration(session.user.id, "teams", {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      accountLabel: label,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    });
    settings.searchParams.set("connected", "teams");
  } catch {
    settings.searchParams.set("error", "ms_oauth");
  }

  const res = NextResponse.redirect(settings);
  res.cookies.delete("ms_oauth_state");
  return res;
}
