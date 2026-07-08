import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import type { Project } from "@/db/schema";

export type ProjectRole = "owner" | "editor" | "viewer";
export type ProjectAccess = { project: Project; role: ProjectRole };

// Owner-only lookup (kept for destructive actions).
export async function getOwnedProject(id: string, userId: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  });
}

// Membership-aware lookup. The creator is always `owner` even before the
// backfill adds their membership row, so this is robust on older data.
export async function getAccessibleProject(
  id: string,
  userId: string
): Promise<ProjectAccess | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
  if (!project) return null;
  if (project.userId === userId) return { project, role: "owner" };

  const member = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)),
  });
  if (!member) return null;
  return { project, role: member.role as ProjectRole };
}

export function roleAtLeast(role: ProjectRole, min: ProjectRole): boolean {
  const rank: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };
  return rank[role] >= rank[min];
}

// Every project the user can act on — owned plus ones shared with them —
// filtered to a minimum role and ordered newest-first. Used by the assignment
// picker so a recording can be filed into any project the user is part of.
export async function listAccessibleProjects(
  userId: string,
  minRole: ProjectRole = "viewer"
): Promise<Array<Project & { role: ProjectRole }>> {
  const owned = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });
  const ownedIds = new Set(owned.map((p) => p.id));

  const memberships = await db
    .select({ projectId: projectMembers.projectId, role: projectMembers.role })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const sharedRole = new Map<string, ProjectRole>();
  for (const m of memberships) {
    if (!ownedIds.has(m.projectId)) sharedRole.set(m.projectId, m.role as ProjectRole);
  }

  const shared = sharedRole.size
    ? await db.query.projects.findMany({ where: inArray(projects.id, [...sharedRole.keys()]) })
    : [];

  const all: Array<Project & { role: ProjectRole }> = [
    ...owned.map((p) => ({ ...p, role: "owner" as ProjectRole })),
    ...shared.map((p) => ({ ...p, role: sharedRole.get(p.id)! })),
  ];

  return all
    .filter((p) => roleAtLeast(p.role, minRole))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
