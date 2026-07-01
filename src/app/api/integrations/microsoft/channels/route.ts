import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidMicrosoftToken } from "@/lib/integrations";
import { channels } from "@/lib/microsoft";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = new URL(req.url).searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const token = await getValidMicrosoftToken(session.user.id);
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  try {
    const list = await channels(token, teamId);
    return NextResponse.json({ channels: list });
  } catch (err) {
    console.error("list channels failed", err);
    return NextResponse.json({ error: "Couldn't load channels" }, { status: 500 });
  }
}
