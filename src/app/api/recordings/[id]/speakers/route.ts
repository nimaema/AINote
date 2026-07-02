import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, transcripts } from "@/db/schema";

export const runtime = "nodejs";

// Map of raw speaker label -> display name. Empty/blank names clear the
// override for that label (falls back to the raw label at render time).
const schema = z.object({
  names: z.record(z.string(), z.string().trim().max(80)),
});

// Rename speakers on a recording's transcript. Owner-only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
    columns: { id: true },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid names" }, { status: 400 });

  // Keep only non-empty overrides.
  const names: Record<string, string> = {};
  for (const [label, name] of Object.entries(parsed.data.names)) {
    const trimmed = name.trim();
    if (trimmed) names[label] = trimmed;
  }

  await db
    .update(transcripts)
    .set({ speakerNames: Object.keys(names).length ? names : null })
    .where(eq(transcripts.recordingId, id));

  return NextResponse.json({ ok: true, names });
}
