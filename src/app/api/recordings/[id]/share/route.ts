import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";

export const runtime = "nodejs";

// Mint (or return the existing) read-only external share token. Owner-only.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rec = await db.query.recordings.findFirst({ where: eq(recordings.id, id) });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let token = rec.shareToken;
  if (!token) {
    token = crypto.randomUUID();
    await db.update(recordings).set({ shareToken: token }).where(eq(recordings.id, id));
  }
  return NextResponse.json({ token });
}

// Revoke the share link. Owner-only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rec = await db.query.recordings.findFirst({ where: eq(recordings.id, id) });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.update(recordings).set({ shareToken: null }).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true });
}
