import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { comments, recordings } from "@/db/schema";

export const runtime = "nodejs";

// Delete a comment. The author or the recording owner may remove it.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const comment = await db.query.comments.findFirst({ where: eq(comments.id, id) });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let allowed = comment.userId === userId;
  if (!allowed) {
    const rec = await db.query.recordings.findFirst({
      where: eq(recordings.id, comment.recordingId),
      columns: { userId: true },
    });
    allowed = rec?.userId === userId;
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(comments).where(eq(comments.id, id));
  return NextResponse.json({ ok: true });
}
