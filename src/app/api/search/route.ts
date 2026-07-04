import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results } from "@/db/schema";
import { accessibleRecordingsCondition } from "@/lib/access";
import { relativeTime } from "@/lib/format";

export const runtime = "nodejs";

function snippet(text: string | null, q: string): string | null {
  if (!text) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, 170) + (text.length > 170 ? "…" : "");
  const start = Math.max(0, idx - 60);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, start + 190) +
    (text.length > start + 190 ? "…" : "")
  );
}

// Full-text + title search across every recording the user can access.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const access = await accessibleRecordingsCondition(session.user.id);
  const like = `%${q}%`;
  const tsv = sql`to_tsvector('english', coalesce(${recordings.searchText}, ''))`;
  const query = sql`plainto_tsquery('english', ${q})`;
  const match = sql`(${recordings.title} ilike ${like} or ${tsv} @@ ${query})`;

  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      status: recordings.status,
      createdAt: recordings.createdAt,
      summary: results.summary,
    })
    .from(recordings)
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .where(and(access, match))
    .orderBy(
      desc(sql`(${recordings.title} ilike ${like})`),
      desc(sql`ts_rank(${tsv}, ${query})`),
      desc(recordings.createdAt)
    )
    .limit(25);

  const now = new Date();
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      title: r.title ?? "Untitled recording",
      status: r.status,
      dateLabel: relativeTime(r.createdAt, now),
      snippet: snippet(r.summary, q),
    })),
  });
}
