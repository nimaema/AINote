import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { canEditRecording } from "@/lib/access";
import { enqueueProcess } from "@/lib/queue";

export const runtime = "nodejs";

// Re-run analysis (summary / actions / decisions / Q&A embeddings) on the
// current transcript — used after editing it. Skips transcription entirely.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await canEditRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .update(recordings)
    .set({ status: "processing", error: null })
    .where(eq(recordings.id, id));
  await enqueueProcess(id);

  return NextResponse.json({ ok: true });
}
