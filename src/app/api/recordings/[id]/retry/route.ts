import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { enqueueTranscribe } from "@/lib/queue";

export const runtime = "nodejs";

// Re-run the pipeline for a failed (or stuck) recording.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(recordings)
    .set({ status: "uploaded", error: null })
    .where(eq(recordings.id, id));

  try {
    await enqueueTranscribe(id);
  } catch (err) {
    console.error("failed to re-enqueue", err);
    return NextResponse.json({ error: "Couldn't restart processing" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
