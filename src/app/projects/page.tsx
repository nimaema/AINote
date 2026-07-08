import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, recordings, results } from "@/db/schema";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
import { TopicsPage, type TopicItem } from "@/components/projects/topics-page";

// The Topics hub: every collection the user owns or is a member of, with
// activity stats and inline create / rename / delete.
export default async function ProjectsIndexPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const memberships = await db
    .select({ id: projectMembers.projectId, role: projectMembers.role })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const roleByProject = new Map(memberships.map((m) => [m.id, m.role]));
  const memberIds = memberships.map((m) => m.id);
  const scope = memberIds.length
    ? or(eq(projects.userId, userId), inArray(projects.id, memberIds))
    : eq(projects.userId, userId);

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      ownerId: projects.userId,
      count: sql<number>`count(${recordings.id})::int`,
      readyCount: sql<number>`count(${recordings.id}) filter (where ${recordings.status} = 'done')::int`,
      activeCount: sql<number>`count(${recordings.id}) filter (where ${recordings.status} in ('uploaded','transcribing','processing'))::int`,
      actionCount: sql<number>`coalesce(sum(jsonb_array_length(${results.actionItems})), 0)::int`,
      lastActivity: sql<Date | string | null>`max(${recordings.createdAt})`,
    })
    .from(projects)
    .leftJoin(recordings, eq(recordings.projectId, projects.id))
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .where(scope)
    .groupBy(projects.id)
    .orderBy(desc(sql`max(${recordings.createdAt})`), desc(projects.createdAt));

  const ids = rows.map((r) => r.id);
  const memberCounts = ids.length
    ? await db
        .select({ projectId: projectMembers.projectId, c: sql<number>`count(*)::int` })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, ids))
        .groupBy(projectMembers.projectId)
    : [];
  const memberCountBy = new Map(memberCounts.map((m) => [m.projectId, m.c]));

  const [unfiled] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(recordings)
    .where(and(eq(recordings.userId, userId), isNull(recordings.projectId)));

  const now = new Date();
  const items: TopicItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    count: r.count,
    readyCount: r.readyCount,
    activeCount: r.activeCount,
    actionCount: r.actionCount,
    memberCount: memberCountBy.get(r.id) ?? 1,
    lastActivityLabel: r.lastActivity ? relativeTime(r.lastActivity, now) : "no activity yet",
    role: r.ownerId === userId ? "owner" : (roleByProject.get(r.id) ?? "viewer"),
  }));

  return (
    <AppShell user={session.user}>
      <TopicsPage items={items} unfiled={unfiled?.c ?? 0} />
    </AppShell>
  );
}
