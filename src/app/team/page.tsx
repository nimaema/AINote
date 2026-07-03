import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, users } from "@/db/schema";
import { relativeTime, humanDuration, humanTotalTime } from "@/lib/format";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import { TeamFeed, type TeamItem, type TeamStats } from "@/components/team/team-feed";

// The workspace feed: every recording any member has shared (isPublic). All
// signed-in users can read them; the note page enforces per-recording access.
export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      status: recordings.status,
      createdAt: recordings.createdAt,
      durationSec: recordings.durationSec,
      summary: results.summary,
      topics: results.topics,
      actionCount: sql<number>`coalesce(jsonb_array_length(${results.actionItems}), 0)::int`,
      language: transcripts.language,
      authorId: recordings.userId,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(recordings)
    .innerJoin(users, eq(users.id, recordings.userId))
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .where(eq(recordings.isPublic, true))
    .orderBy(desc(recordings.createdAt))
    .limit(200);

  const now = new Date();
  const items: TeamItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled recording",
    status: r.status,
    dateLabel: relativeTime(r.createdAt, now),
    durationLabel: humanDuration(r.durationSec),
    summary: r.summary,
    topics: r.topics ?? [],
    language: languageName(r.language),
    actionCount: r.actionCount,
    authorId: r.authorId,
    authorName: r.authorName ?? r.authorEmail?.split("@")[0] ?? "Teammate",
    isMine: r.authorId === userId,
  }));

  const stats: TeamStats = {
    shared: rows.length,
    contributors: new Set(rows.map((r) => r.authorId)).size,
    totalTimeLabel: humanTotalTime(rows.reduce((sum, r) => sum + (r.durationSec ?? 0), 0)),
    openActions: rows.reduce((sum, r) => sum + r.actionCount, 0),
  };

  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[@ ]/)[0];

  return (
    <AppShell user={session.user}>
      <TeamFeed items={items} stats={stats} userName={firstName} />
    </AppShell>
  );
}
