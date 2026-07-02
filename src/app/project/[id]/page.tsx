import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, projectQaMessages } from "@/db/schema";
import { getOwnedProject } from "@/lib/projects-server";
import { projectColor } from "@/lib/projects";
import { relativeTime, humanDuration } from "@/lib/format";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import { RecordingsList, type RecItem } from "@/components/dashboard/recordings-list";
import { QAPanel } from "@/components/note/qa-panel";
import { ProjectActions } from "@/components/projects/project-actions";
import { ArrowLeft, FolderSimple } from "@phosphor-icons/react/dist/ssr";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;
  const project = await getOwnedProject(id, userId);
  if (!project) notFound();

  const [rows, history] = await Promise.all([
    db
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
      })
      .from(recordings)
      .leftJoin(results, eq(results.recordingId, recordings.id))
      .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
      .where(and(eq(recordings.userId, userId), eq(recordings.projectId, id)))
      .orderBy(desc(recordings.createdAt)),
    db.query.projectQaMessages.findMany({
      where: eq(projectQaMessages.projectId, id),
      orderBy: [asc(projectQaMessages.createdAt)],
    }),
  ]);

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
    projectId: id,
    projectName: project.name,
    projectColor: project.color,
  }));

  const readyCount = rows.filter((r) => r.status === "done").length;

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink"
        >
          <ArrowLeft size={15} /> All captures
        </Link>

        <div className="glass mt-4 mb-6 flex flex-wrap items-start justify-between gap-4 rounded-panel p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-input text-bg"
              style={{ background: projectColor(project.color) }}
            >
              <FolderSimple size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-semibold tracking-[-0.01em] text-ink sm:text-[22px]">
                {project.name}
              </h1>
              <p className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[12px] text-faint">
                <span>{rows.length} {rows.length === 1 ? "recording" : "recordings"}</span>
                <span>{readyCount} ready</span>
              </p>
            </div>
          </div>
          <ProjectActions id={project.id} name={project.name} color={project.color} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div>
            {items.length === 0 ? (
              <div className="glass-soft rounded-panel px-6 py-12 text-center">
                <p className="text-[14px] font-medium text-ink">No recordings in this project yet</p>
                <p className="mt-1 text-[13px] text-muted">
                  Open a recording and use the folder icon to move it here.
                </p>
              </div>
            ) : (
              <RecordingsList items={items} heading="Recordings" hideProject />
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <QAPanel
              endpoint={`/api/projects/${id}/qa`}
              title="Ask across this project"
              emptyHint="Ask anything spanning every recording in this project."
              suggestions={["Summarize this project", "What decisions were made?", "What's still open across all of these?"]}
              initialMessages={history.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                citations: m.citations,
              }))}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
