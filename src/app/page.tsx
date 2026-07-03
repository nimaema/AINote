import { redirect } from "next/navigation";
import { desc, eq, inArray, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, projects, projectMembers } from "@/db/schema";
import type { ActionItem } from "@/db/schema";
import { relativeTime, dateTimeLabel, humanDuration, humanTotalTime, humanBytes } from "@/lib/format";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import {
  WorkbenchV2,
  type WorkbenchProject,
  type WorkbenchRecording,
  type WorkbenchStats,
} from "@/components/dashboard/workbench-v2";

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
      active: sql<number>`count(*) filter (where ${recordings.status} in ('uploaded', 'transcribing', 'processing'))::int`,
      publicCount: sql<number>`count(*) filter (where ${recordings.isPublic} = true)::int`,
      unfiled: sql<number>`count(*) filter (where ${recordings.projectId} is null)::int`,
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
      sizeBytes: recordings.sizeBytes,
      isPublic: recordings.isPublic,
      error: recordings.error,
      language: transcripts.language,
      summary: results.summary,
      topics: results.topics,
      actionItems: results.actionItems,
      decisions: results.decisions,
      followUps: results.followUps,
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

  // Projects the user owns or is a member of.
  const memberProjectIds = (
    await db
      .select({ id: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
  ).map((r) => r.id);
  const projectScope = memberProjectIds.length
    ? or(eq(projects.userId, userId), inArray(projects.id, memberProjectIds))
    : eq(projects.userId, userId);

  // Projects with their recording counts.
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      count: sql<number>`count(${recordings.id})::int`,
      readyCount: sql<number>`count(${recordings.id}) filter (where ${recordings.status} = 'done')::int`,
      activeCount: sql<number>`count(${recordings.id}) filter (where ${recordings.status} in ('uploaded', 'transcribing', 'processing'))::int`,
      actionCount: sql<number>`coalesce(sum(jsonb_array_length(${results.actionItems})), 0)::int`,
      lastActivity: sql<Date | string | null>`max(${recordings.createdAt})`,
    })
    .from(projects)
    .leftJoin(recordings, eq(recordings.projectId, projects.id))
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .where(projectScope)
    .groupBy(projects.id)
    .orderBy(desc(sql`max(${recordings.createdAt})`), desc(projects.createdAt));

  const now = new Date();
  const items: WorkbenchRecording[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled recording",
    status: r.status,
    source: r.source,
    dateLabel: relativeTime(r.createdAt, now),
    createdAtLabel: dateTimeLabel(r.createdAt),
    durationLabel: humanDuration(r.durationSec),
    sizeLabel: humanBytes(r.sizeBytes),
    isPublic: r.isPublic,
    error: r.error,
    language: languageName(r.language),
    summary: r.summary,
    topics: r.topics ?? [],
    actionItems: (r.actionItems ?? []) as ActionItem[],
    decisions: r.decisions ?? [],
    followUps: r.followUps ?? [],
    projectId: r.projectId,
    projectName: r.projectName,
    projectColor: r.projectColor,
  }));

  const projectItems: WorkbenchProject[] = projectRows.map((project) => ({
    id: project.id,
    name: project.name,
    color: project.color,
    count: project.count,
    readyCount: project.readyCount,
    activeCount: project.activeCount,
    actionCount: project.actionCount,
    lastActivityLabel: project.lastActivity ? relativeTime(project.lastActivity, now) : "empty",
  }));

  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[@ ]/)[0];
  const dashboardStats: WorkbenchStats = {
    total: stats.total,
    ready: stats.ready,
    active: stats.active,
    failed: stats.failed,
    publicCount: stats.publicCount,
    unfiled: stats.unfiled,
    actionCount: items.reduce((total, item) => total + item.actionItems.length, 0),
    totalDurationLabel: humanTotalTime(stats.totalDuration),
  };

  return (
    <AppShell user={session.user}>
      <WorkbenchV2 userName={firstName} recordings={items} projects={projectItems} stats={dashboardStats} />
    </AppShell>
  );
}
