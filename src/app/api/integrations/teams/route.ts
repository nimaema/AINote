import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { upsertIntegration, deleteIntegration } from "@/lib/integrations";

const schema = z.object({ webhookUrl: z.string().url() });

// Saves a Teams incoming-webhook / workflow URL for the user.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid webhook URL is required" }, { status: 400 });
  }
  const { webhookUrl } = parsed.data;
  if (!/^https:\/\//i.test(webhookUrl)) {
    return NextResponse.json({ error: "Webhook URL must be https" }, { status: 400 });
  }

  await upsertIntegration(session.user.id, "teams", {
    config: { webhookUrl },
    accountLabel: "Teams channel",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteIntegration(session.user.id, "teams");
  return NextResponse.json({ ok: true });
}
