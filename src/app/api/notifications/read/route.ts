import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export const runtime = "nodejs";

// Mark all of the current user's notifications read.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)));

  return NextResponse.json({ ok: true });
}
