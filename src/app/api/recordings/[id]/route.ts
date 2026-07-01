import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { removeObject } from "@/lib/storage";

export const runtime = "nodejs";

async function owned(id: string, userId: string) {
  return db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, userId)),
  });
}

const patchSchema = z.object({ title: z.string().trim().min(1).max(200) });

// Rename a recording.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await owned(id, session.user.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  await db.update(recordings).set({ title: parsed.data.title }).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true, title: parsed.data.title });
}

// Delete a recording, its audio, and (via FK cascade) transcript/results/qa.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await owned(id, session.user.id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Best-effort audio removal; the DB row goes regardless.
  try {
    await removeObject(rec.storageKey);
  } catch (err) {
    console.error("failed to remove audio object", err);
  }
  await db.delete(recordings).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true });
}
