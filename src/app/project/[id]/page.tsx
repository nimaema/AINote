import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, projectQaMessages } from "@/db/schema";
import type { ActionItem } from "@/db/schema";
import { getAccessibleProject, roleAtLeast } from "@/lib/projects-server";
import { projectColor } from "@/lib/projects";
import { MembersPanel } from "@/components/projects/members-panel";
import { relativeTime, humanDuration, humanTotalTime } from "@/lib/format";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import { RecordingsList, type RecItem } from "@/components/dashboard/recordings-list";
import { QAPanel } from "@/components/note/qa-panel";
import { ProjectActions } from "@/components/projects/project-actions";
import {
  ArrowLeft,
  ArrowRight,
  FolderSimple,
  ListChecks,
  WaveSawtooth,
} from "@phosphor-icons/react/dist/ssr";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;
  const access = await getAccessibleProject(id, userId);
  if (!access) notFound();
  const project = access.project;
  const canEdit = roleAtLeast(access.role, "editor");

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
        actionItems: results.actionItems,
        actionCount: sql<number>`coalesce(jsonb_array_length(${results.actionItems}), 0)::int`,
      })
      .from(recordings)
      .leftJoin(results, eq(results.recordingId, recordings.id))
      .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
      .where(eq(recordings.projectId, id))
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
  const activeCount = rows.filter((r) => ["uploaded", "transcribing", "processing"].includes(r.status)).length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const totalDuration = rows.reduce((sum, row) => sum + (row.durationSec ?? 0), 0);
  const actionItems = rows.flatMap((row) =>
    ((row.actionItems ?? []) as ActionItem[]).map((item, index) => ({
      ...item,
      key: `${row.id}-${index}`,
      recordingId: row.id,
      recordingTitle: row.title ?? "Untitled recording",
      dateLabel: relativeTime(row.createdAt, now),
    }))
  );

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-[1540px] px-3 pb-28 pt-3 sm:px-5 md:px-7 md:pb-12 md:pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink"
        >
          <ArrowLeft size={15} /> All captures
        </Link>

        <div className="mt-4 mb-5 overflow-hidden rounded-[18px] border border-hairline bg-panel-solid">
          <div className="grid gap-px bg-hairline lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="bg-panel-solid p-5 sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <span
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] text-bg"
                  style={{ background: projectColor(project.color) }}
                >
                  <FolderSimple size={24} weight="fill" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Project workspace</p>
                  <h1 className="mt-1 truncate font-display text-[32px] font-normal leading-none tracking-[-0.01em] text-ink sm:text-[44px]">
                    {project.name}
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center bg-bg p-4 sm:p-5 lg:min-w-[18rem] lg:justify-end">
              {canEdit ? (
                <ProjectActions id={project.id} name={project.name} color={project.color} />
              ) : (
                <span className="rounded-pill bg-panel px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {access.role}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-px overflow-hidden rounded-[18px] border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-5">
          <ProjectMetric label="Captures" value={String(rows.length)} />
          <ProjectMetric label="Ready" value={String(readyCount)} />
          <ProjectMetric label="In queue" value={String(activeCount)} tone={activeCount > 0 ? "accent" : undefined} />
          <ProjectMetric label="Failed" value={String(failedCount)} tone={failedCount > 0 ? "err" : undefined} />
          <ProjectMetric label="Runtime" value={humanTotalTime(totalDuration)} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0">
            {items.length === 0 ? (
              <div className="rounded-[18px] border border-hairline bg-panel-solid px-6 py-12 text-center">
                <p className="text-[14px] font-medium text-ink">No recordings in this project yet</p>
                <p className="mt-1 text-[13px] text-muted">
                  Open a recording and use the folder icon to move it here.
                </p>
              </div>
            ) : (
              <RecordingsList items={items} heading="Recordings" hideProject />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
            <MembersPanel projectId={id} canManage={access.role === "owner"} />

            <section className="rounded-[18px] border border-hairline bg-panel-solid p-4">
              <div className="flex items-center gap-2 text-accent-deep">
                <ListChecks size={17} weight="duotone" />
                <h2 className="text-[13.5px] font-semibold text-ink">Project actions</h2>
                {actionItems.length > 0 && (
                  <span className="rounded-[7px] bg-bg px-2 py-0.5 font-mono text-[10.5px] text-faint">
                    {actionItems.length}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {actionItems.slice(0, 7).map((item) => (
                  <Link
                    key={item.key}
                    href={`/note/${item.recordingId}`}
                    className="group rounded-[14px] border border-hairline bg-bg p-3 transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel active:scale-[0.99] cursor-pointer"
                  >
                    <p className="text-[13.5px] leading-relaxed text-ink-soft">{item.task}</p>
                    <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-faint">
                      <span className="truncate">{item.recordingTitle}</span>
                      <ArrowRight size={13} className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
                    </p>
                  </Link>
                ))}
                {actionItems.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-hairline bg-bg px-4 py-5 text-center">
                    <WaveSawtooth size={22} className="mx-auto text-faint" />
                    <p className="mt-3 text-[13px] font-semibold text-ink">No project actions yet</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                      Process recordings in this project to collect tasks here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <QAPanel
              endpoint={`/api/projects/${id}/qa`}
              title="Ask everything"
              emptyHint="One question across every recording here — answers cite the exact meeting and moment."
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

function ProjectMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "err";
}) {
  return (
    <div className="bg-panel-solid px-4 py-3">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p
        className={`tabular mt-1 text-[22px] font-semibold tracking-[-0.01em] ${
          tone === "accent" ? "text-accent-deep" : tone === "err" ? "text-err" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
