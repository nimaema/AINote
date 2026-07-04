import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotifType = "assigned" | "mentioned" | "shared" | "commented" | "project_added";

export type NewNotification = {
  userId: string;
  type: NotifType;
  body: string;
  actorId?: string | null;
  actorName?: string | null;
  recordingId?: string | null;
  projectId?: string | null;
};

// Fire-and-forget inbox write. Never notifies the actor about their own action.
export async function createNotification(n: NewNotification) {
  if (n.actorId && n.actorId === n.userId) return;
  await db.insert(notifications).values({
    userId: n.userId,
    type: n.type,
    body: n.body,
    actorId: n.actorId ?? null,
    actorName: n.actorName ?? null,
    recordingId: n.recordingId ?? null,
    projectId: n.projectId ?? null,
  });
}

export async function createNotifications(list: NewNotification[]) {
  const rows = list.filter((n) => !(n.actorId && n.actorId === n.userId));
  if (rows.length === 0) return;
  await db.insert(notifications).values(
    rows.map((n) => ({
      userId: n.userId,
      type: n.type,
      body: n.body,
      actorId: n.actorId ?? null,
      actorName: n.actorName ?? null,
      recordingId: n.recordingId ?? null,
      projectId: n.projectId ?? null,
    }))
  );
}
