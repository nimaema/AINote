import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations, results } from "@/db/schema";
import type { ActionItem } from "@/db/schema";
import { getAccessibleRecording } from "@/lib/access";
import { sendToSlack } from "@/lib/slack";

export const runtime = "nodejs";

// Post this note's summary + action items to the sender's connected Slack channel.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await db.query.integrations.findFirst({
    where: and(eq(integrations.userId, session.user.id), eq(integrations.provider, "slack")),
  });
  const webhookUrl = integration?.config?.webhookUrl;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Connect Slack in Settings first." }, { status: 400 });
  }

  const res = await db.query.results.findFirst({ where: eq(results.recordingId, id) });
  const origin = new URL(req.url).origin;

  try {
    await sendToSlack(webhookUrl, {
      title: access.recording.title ?? "Untitled recording",
      summary: res?.summary ?? null,
      actionItems: (res?.actionItems ?? []) as ActionItem[],
      noteUrl: `${origin}/note/${id}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("slack export failed", err);
    return NextResponse.json({ error: "Slack rejected the message. Check the webhook." }, { status: 502 });
  }
}
