import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getValidMicrosoftToken } from "@/lib/integrations";
import { joinedTeams } from "@/lib/microsoft";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getValidMicrosoftToken(session.user.id);
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  try {
    const teams = await joinedTeams(token);
    return NextResponse.json({ teams });
  } catch (err) {
    console.error("list teams failed", err);
    return NextResponse.json({ error: "Couldn't load teams" }, { status: 500 });
  }
}
