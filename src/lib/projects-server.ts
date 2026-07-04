import "server-only";
import { and, eq } from "drizzle-orm";
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
