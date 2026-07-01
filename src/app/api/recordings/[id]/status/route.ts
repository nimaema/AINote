import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";

// Lightweight status poll for the processing view.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
    columns: { status: true, error: true },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ status: rec.status, error: rec.error });
}
