import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { recordings, projectMembers } from "@/db/schema";
import type { Recording } from "@/db/schema";

export type RecordingAccess = {
  recording: Recording;
  isOwner: boolean;
};

// Read access to a single recording:
//   - the owner can always access it
//   - a member of the recording's project can access it
//   - any signed-in user can access it when it's marked public
export async function getAccessibleRecording(
  id: string,
  userId: string
): Promise<RecordingAccess | null> {
  const rec = await db.query.recordings.findFirst({
    where: eq(recordings.id, id),
  });
  if (!rec) return null;

  const isOwner = rec.userId === userId;
  if (isOwner) return { recording: rec, isOwner: true };

  if (rec.projectId) {
    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, rec.projectId),
        eq(projectMembers.userId, userId)
      ),
    });
    if (member) return { recording: rec, isOwner: false };
  }

  if (rec.isPublic) return { recording: rec, isOwner: false };
  return null;
}

// Write access for team actions (complete/assign an action, comment, edit).
//   canEdit = owner OR project editor/owner. Public viewers get read-only.
export async function canEditRecording(
  id: string,
  userId: string
): Promise<{ recording: Recording; canEdit: boolean } | null> {
  const rec = await db.query.recordings.findFirst({
    where: eq(recordings.id, id),
  });
  if (!rec) return null;
  if (rec.userId === userId) return { recording: rec, canEdit: true };

  if (rec.projectId) {
    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, rec.projectId),
        eq(projectMembers.userId, userId)
      ),
    });
    if (member && (member.role === "owner" || member.role === "editor")) {
      return { recording: rec, canEdit: true };
    }
    if (member) return { recording: rec, canEdit: false };
  }

  if (rec.isPublic) return { recording: rec, canEdit: false };
  return null;
}

// A Drizzle WHERE condition selecting every recording the user can read:
// owned, public, or belonging to a project they're a member of. For search and
// workspace-wide Q&A.
export async function accessibleRecordingsCondition(userId: string): Promise<SQL> {
  const memberProjectIds = (
    await db
      .select({ id: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
  ).map((r) => r.id);

  const conds: SQL[] = [
    eq(recordings.userId, userId),
    eq(recordings.isPublic, true),
  ];
  if (memberProjectIds.length) {
    conds.push(inArray(recordings.projectId, memberProjectIds));
  }
  return or(...conds) ?? sql`false`;
}
