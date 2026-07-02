import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, projects } from "@/db/schema";
import { relativeTime, humanDuration, humanTotalTime } from "@/lib/format";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import { RecordingsList, type RecItem } from "@/components/dashboard/recordings-list";
import { ProjectsSection } from "@/components/projects/projects-section";
import { Microphone, UploadSimple } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(${recordings.durationSec}), 0)::int`,
      ready: sql<number>`count(*) filter (where ${recordings.status} = 'done')::int`,
      failed: sql<number>`count(*) filter (where ${recordings.status} = 'failed')::int`,
    })
    .from(recordings)
    .where(eq(recordings.userId, userId));

  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      status: recordings.status,
      source: recordings.source,
      createdAt: recordings.createdAt,
      durationSec: recordings.durationSec,
      isPublic: recordings.isPublic,
      language: transcripts.language,
      summary: results.summary,
      topics: results.topics,
      actionCount: sql<number>`coalesce(jsonb_array_length(${results.actionItems}), 0)::int`,
      projectId: recordings.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(recordings)
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .leftJoin(projects, eq(projects.id, recordings.projectId))
    .where(eq(recordings.userId, userId))
    .orderBy(desc(recordings.createdAt))
    .limit(200);

  // Projects with their recording counts.
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      count: sql<number>`count(${recordings.id})::int`,
    })
    .from(projects)
    .leftJoin(recordings, eq(recordings.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  const now = new Date();
  const items: RecItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled recording",
    status: r.status,
    source: r.source,
    dateLabel: relativeTime(r.createdAt, now),
    durationLabel: humanDuration(r.durationSec),
    isPublic: r.isPublic,
    language: languageName(r.language),
    summary: r.summary,
    topics: r.topics ?? [],
    actionCount: r.actionCount,
    projectId: r.projectId,
    projectName: r.projectName,
    projectColor: r.projectColor,
  }));

  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[@ ]/)[0];

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-5">
          <div>
            <p className="font-mono text-[11px] text-faint">Workspace</p>
            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.015em] text-ink">Overview</h1>
            <p className="mt-1 text-[13px] text-muted">
              Welcome back, {firstName}. Captures, projects, and notes are ready for review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/record?mode=upload"
              className="glass inline-flex h-9 items-center gap-1.5 rounded-btn px-3.5 text-[13px] font-medium text-ink-soft transition-[background-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift hover:text-ink active:scale-[0.98] cursor-pointer"
            >
              <UploadSimple size={15} /> Upload
            </Link>
            <Link
              href="/record?mode=record"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-accent px-3.5 text-[13px] font-semibold text-accent-ink shadow-[0_14px_30px_-18px_rgba(240,182,74,0.8)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-px active:scale-[0.98] cursor-pointer"
            >
              <Microphone size={15} weight="fill" /> Record
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="glass grid grid-cols-2 overflow-hidden rounded-card sm:grid-cols-4 sm:divide-x sm:divide-hairline max-sm:[&>*]:border-hairline max-sm:[&>*:nth-child(even)]:border-l max-sm:[&>*:nth-child(n+3)]:border-t">
          <Stat label="Captures" value={String(stats.total)} />
          <Stat label="Total time" value={humanTotalTime(stats.totalDuration)} />
          <Stat label="Ready" value={String(stats.ready)} accent />
          <Stat label="Failed" value={String(stats.failed)} alert={stats.failed > 0} />
        </div>

        <ProjectsSection projects={projectRows} />

        <RecordingsList items={items} heading="Captures" />
      </main>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
  alert,
}: {
  label: string;
  value: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[10.5px] text-faint">{label}</p>
      <p
        className={`tabular mt-1 text-[22px] font-semibold tracking-[-0.01em] ${
          alert ? "text-err" : accent ? "text-accent-deep" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
