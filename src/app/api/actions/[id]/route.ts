import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actionItems, users } from "@/db/schema";
import { canEditRecording } from "@/lib/access";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["open", "done"]).optional(),
  // Multi-assignee: a list of teammate ids, and/or the whole team.
  assigneeIds: z.array(z.string()).max(50).optional(),
  assignAll: z.boolean().optional(),
  task: z.string().trim().min(1).max(500).optional(),
  dueLabel: z.string().trim().max(120).nullable().optional(),
});

// Update an action item: complete it, (re)assign it, or edit its text.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const action = await db.query.actionItems.findFirst({ where: eq(actionItems.id, id) });
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const data = parsed.data;

  const access = await canEditRecording(action.recordingId, userId);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Editors manage everything; anyone the task is assigned to (individually or
  // as part of the whole team) may at least tick their own task off.
  const prevIds = action.assigneeIds ?? [];
  const onlyStatus = Object.keys(data).every((k) => k === "status");
  const isAssignee = action.assignAll || prevIds.includes(userId);
  if (!access.canEdit && !(isAssignee && onlyStatus)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve the desired assignment (when either field is provided).
  const assigningAll = data.assignAll ?? action.assignAll;
  const nextIds = assigningAll ? [] : (data.assigneeIds ?? prevIds);

  const fields: Partial<typeof actionItems.$inferInsert> = {};
  if (data.status !== undefined) fields.status = data.status;
  if (data.task !== undefined) fields.task = data.task;
  if (data.dueLabel !== undefined) fields.dueLabel = data.dueLabel;
  if (data.assigneeIds !== undefined || data.assignAll !== undefined) {
    fields.assigneeIds = nextIds;
    fields.assignAll = assigningAll;
    // Keep the legacy single-assignee column mirrored to the first assignee.
    fields.assigneeId = nextIds[0] ?? null;
  }

  await db.update(actionItems).set(fields).where(eq(actionItems.id, id));

  // Notify people the task is now on: newly-added individuals, or — when it was
  // just handed to the whole team — every other active member.
  const actorName = session.user.name ?? session.user.email ?? "A teammate";
  const preview = action.task.slice(0, 120);
  if (data.assigneeIds !== undefined || data.assignAll !== undefined) {
    let recipients: string[] = [];
    if (assigningAll && !action.assignAll) {
      recipients = (
        await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.active, true), ne(users.id, userId)))
      ).map((u) => u.id);
    } else {
      recipients = nextIds.filter((rid) => rid !== userId && !prevIds.includes(rid));
    }
    for (const rid of recipients) {
      await createNotification({
        userId: rid,
        type: "assigned",
        actorId: userId,
        actorName,
        recordingId: action.recordingId,
        body: assigningAll ? `assigned the team: ${preview}` : `assigned you: ${preview}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
