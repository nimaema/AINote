import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getIntegration, upsertIntegration } from "@/lib/integrations";

export const runtime = "nodejs";

const schema = z.object({
  teamId: z.string().min(1),
  channelId: z.string().min(1),
  teamName: z.string().default(""),
  channelName: z.string().default(""),
});

// Saves the target Teams channel (keeps existing tokens).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const it = await getIntegration(session.user.id, "teams");
  if (!it?.accessToken) return NextResponse.json({ error: "Connect Microsoft first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a team and channel" }, { status: 400 });

  await upsertIntegration(session.user.id, "teams", { config: parsed.data });
  return NextResponse.json({ ok: true });
}
