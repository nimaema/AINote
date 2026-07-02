import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import type { Recording } from "@/db/schema";

export type RecordingAccess = {
  recording: Recording;
  isOwner: boolean;
};

// Central access rule for a single recording:
//   - the owner can always access it
//   - any signed-in user can access it when it's marked public
// Editing actions (rename, delete, speakers, visibility, export) must
// additionally check `isOwner`.
export async function getAccessibleRecording(
  id: string,
  userId: string
): Promise<RecordingAccess | null> {
  const rec = await db.query.recordings.findFirst({
    where: eq(recordings.id, id),
  });
  if (!rec) return null;

  const isOwner = rec.userId === userId;
  if (!isOwner && !rec.isPublic) return null;

  return { recording: rec, isOwner };
}
