import { redirect } from "next/navigation";
import { asc, desc, eq, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { actionItems, recordings } from "@/db/schema";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
import { MyTasksList, type TaskItem } from "@/components/tasks/my-tasks-list";

// Everything assigned to the current user, across every recording.
export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const rows = await db
    .select({
      id: actionItems.id,
      task: actionItems.task,
      status: actionItems.status,
      dueLabel: actionItems.dueLabel,
      sourceMs: actionItems.sourceMs,
      assignAll: actionItems.assignAll,
      recordingId: actionItems.recordingId,
      recTitle: recordings.title,
      recCreatedAt: recordings.createdAt,
    })
    .from(actionItems)
    .innerJoin(recordings, eq(recordings.id, actionItems.recordingId))
    // Assigned directly to me, or handed to the whole team.
    .where(
      or(
        eq(actionItems.assignAll, true),
        sql`${actionItems.assigneeIds} @> ${JSON.stringify([userId])}::jsonb`
      )
    )
    .orderBy(asc(actionItems.status), desc(recordings.createdAt));

  const now = new Date();
  const items: TaskItem[] = rows.map((r) => ({
    id: r.id,
    task: r.task,
    status: r.status,
    dueLabel: r.dueLabel,
    sourceMs: r.sourceMs,
    viaTeam: r.assignAll,
    recordingId: r.recordingId,
    recTitle: r.recTitle ?? "Untitled recording",
    dateLabel: relativeTime(r.recCreatedAt, now),
  }));

  const openCount = items.filter((i) => i.status === "open").length;
  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[@ ]/)[0];

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        <div className="mb-5 border-b border-hairline px-1 pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Workspace · your worklist</p>
          <h1 className="mt-1.5 font-display text-[23px] leading-tight text-ink">
            {openCount > 0 ? `${openCount} on your plate.` : "You're all caught up."}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Everything teammates have assigned {firstName}, pulled from every recording.
          </p>
        </div>

        <MyTasksList items={items} />
      </main>
    </AppShell>
  );
}
