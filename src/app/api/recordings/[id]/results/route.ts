import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { results } from "@/db/schema";
import { canEditRecording } from "@/lib/access";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    summary: z.string().max(20000).optional(),
    decisions: z.array(z.string().max(2000)).max(100).optional(),
    topics: z.array(z.string().max(200)).max(100).optional(),
    followUps: z.array(z.string().max(2000)).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// Curate the AI notes. Records who edited them so the UI can show provenance.
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

  const fields: Record<string, unknown> = {
    editedAt: new Date(),
    editedBy: session.user.name ?? session.user.email ?? "A teammate",
  };
  if (parsed.data.summary !== undefined) fields.summary = parsed.data.summary;
  if (parsed.data.decisions !== undefined) fields.decisions = parsed.data.decisions;
  if (parsed.data.topics !== undefined) fields.topics = parsed.data.topics;
  if (parsed.data.followUps !== undefined) fields.followUps = parsed.data.followUps;

  await db.update(results).set(fields).where(eq(results.recordingId, id));
  return NextResponse.json({ ok: true });
}
