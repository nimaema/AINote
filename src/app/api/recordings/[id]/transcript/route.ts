import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transcripts } from "@/db/schema";
import type { Utterance } from "@/db/schema";
import { canEditRecording } from "@/lib/access";

export const runtime = "nodejs";

const patchSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().trim().min(1).max(5000),
});

// Correct a single transcript utterance. Originals are preserved; the edit is
// written to `editedUtterances`/`editedText`, which the note view then prefers.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await canEditRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const tr = await db.query.transcripts.findFirst({
    where: eq(transcripts.recordingId, id),
  });
  if (!tr) return NextResponse.json({ error: "No transcript" }, { status: 404 });

  const base: Utterance[] = (tr.editedUtterances ?? tr.utterances ?? []).map((u) => ({ ...u }));
  if (parsed.data.index >= base.length)
    return NextResponse.json({ error: "Out of range" }, { status: 400 });

  base[parsed.data.index] = { ...base[parsed.data.index], text: parsed.data.text };
  const editedText = base.map((u) => `${u.speaker}: ${u.text}`).join("\n");

  await db
    .update(transcripts)
    .set({ editedUtterances: base, editedText, editedAt: new Date() })
    .where(eq(transcripts.recordingId, id));

  return NextResponse.json({ ok: true });
}
