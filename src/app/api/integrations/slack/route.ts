import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { isSlackWebhook } from "@/lib/slack";

export const runtime = "nodejs";

async function getSlack(userId: string) {
  return db.query.integrations.findFirst({
    where: and(eq(integrations.userId, userId), eq(integrations.provider, "slack")),
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await getSlack(session.user.id);
  return NextResponse.json({ connected: !!row, label: row?.accountLabel ?? null });
}

const postSchema = z.object({ webhookUrl: z.string().url() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSlackWebhook(parsed.data.webhookUrl)) {
    return NextResponse.json(
      { error: "Enter a Slack incoming-webhook URL (https://hooks.slack.com/services/…)." },
      { status: 400 }
    );
  }

  await db
    .insert(integrations)
    .values({
      userId: session.user.id,
      provider: "slack",
      accountLabel: "Slack channel",
      config: { webhookUrl: parsed.data.webhookUrl },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: { config: { webhookUrl: parsed.data.webhookUrl }, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, session.user.id), eq(integrations.provider, "slack")));
  return NextResponse.json({ ok: true });
}
