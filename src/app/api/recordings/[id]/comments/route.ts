import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { getAccessibleRecording } from "@/lib/access";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

// Thread of comments on a recording. Any user who can view it can read + post.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      startMs: comments.startMs,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      authorId: comments.userId,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.recordingId, id))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      startMs: c.startMs,
      parentId: c.parentId,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorName: c.authorName ?? c.authorEmail?.split("@")[0] ?? "Teammate",
    })),
  });
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  startMs: z.number().int().nonnegative().nullable().optional(),
  parentId: z.string().nullable().optional(),
  mentions: z.array(z.string()).max(20).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const access = await getAccessibleRecording(id, userId);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const mentions = [...new Set(parsed.data.mentions ?? [])].filter((m) => m !== userId);

  const [row] = await db
    .insert(comments)
    .values({
      recordingId: id,
      userId,
      body: parsed.data.body,
      startMs: parsed.data.startMs ?? null,
      parentId: parsed.data.parentId ?? null,
      mentions: mentions.length ? mentions : null,
    })
    .returning();

  const actorName = session.user.name ?? session.user.email ?? "A teammate";
  const notify = new Map<string, "mentioned" | "commented">();
  mentions.forEach((m) => notify.set(m, "mentioned"));
  // Notify the recording owner too (unless they were mentioned or are the author).
  if (access.recording.userId !== userId && !notify.has(access.recording.userId)) {
    notify.set(access.recording.userId, "commented");
  }
  if (notify.size > 0) {
    await createNotifications(
      [...notify.entries()].map(([uid, type]) => ({
        userId: uid,
        type,
        actorId: userId,
        actorName,
        recordingId: id,
        body:
          type === "mentioned"
            ? `mentioned you: ${parsed.data.body.slice(0, 100)}`
            : `commented: ${parsed.data.body.slice(0, 100)}`,
      }))
    );
  }

  return NextResponse.json({
    comment: {
      id: row.id,
      body: row.body,
      startMs: row.startMs,
      parentId: row.parentId,
      createdAt: row.createdAt,
      authorId: userId,
      authorName: actorName,
    },
  });
}
