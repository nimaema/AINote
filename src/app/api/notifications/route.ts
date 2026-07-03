import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export const runtime = "nodejs";

// Recent inbox + unread count for the bell. Polled by the client.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [rows, [{ unread }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);

  return NextResponse.json({
    unread,
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      body: n.body,
      actorName: n.actorName,
      recordingId: n.recordingId,
      projectId: n.projectId,
      read: n.readAt != null,
      createdAt: n.createdAt,
    })),
  });
}
