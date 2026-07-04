import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actionItems } from "@/db/schema";
import { canEditRecording } from "@/lib/access";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["open", "done"]).optional(),
  assigneeId: z.string().nullable().optional(),
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

  // Editors manage everything; an assignee may at least tick their own task off.
  const onlyStatus = Object.keys(data).every((k) => k === "status");
  const isAssignee = action.assigneeId === userId;
  if (!access.canEdit && !(isAssignee && onlyStatus)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fields: Partial<typeof actionItems.$inferInsert> = {};
  if (data.status !== undefined) fields.status = data.status;
  if (data.task !== undefined) fields.task = data.task;
  if (data.dueLabel !== undefined) fields.dueLabel = data.dueLabel;
  if (data.assigneeId !== undefined) fields.assigneeId = data.assigneeId;

  await db.update(actionItems).set(fields).where(eq(actionItems.id, id));

  // Notify a newly assigned teammate.
  if (data.assigneeId && data.assigneeId !== action.assigneeId) {
    await createNotification({
      userId: data.assigneeId,
      type: "assigned",
      actorId: userId,
      actorName: session.user.name ?? session.user.email ?? "A teammate",
      recordingId: action.recordingId,
      body: `assigned you: ${action.task.slice(0, 120)}`,
    });
  }

  return NextResponse.json({ ok: true });
}
