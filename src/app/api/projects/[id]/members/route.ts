import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, users } from "@/db/schema";
import { getAccessibleProject } from "@/lib/projects-server";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

// List members (owner always included first), plus the caller's own role.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await getAccessibleProject(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, id));

  const owner = await db.query.users.findFirst({
    where: eq(users.id, access.project.userId),
    columns: { id: true, name: true, email: true },
  });

  const members = [
    ...(owner
      ? [{ userId: owner.id, name: owner.name ?? owner.email?.split("@")[0] ?? "Owner", email: owner.email, role: "owner" as const }]
      : []),
    ...rows
      .filter((r) => r.userId !== access.project.userId)
      .map((r) => ({
        userId: r.userId,
        name: r.name ?? r.email?.split("@")[0] ?? "Teammate",
        email: r.email,
        role: r.role,
      })),
  ];

  return NextResponse.json({ role: access.role, members });
}

const postSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

// Add or update a member. Owner-only.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  if (parsed.data.userId === project.userId)
    return NextResponse.json({ error: "That user owns this project" }, { status: 400 });

  await db
    .insert(projectMembers)
    .values({ projectId: id, userId: parsed.data.userId, role: parsed.data.role })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role: parsed.data.role },
    });

  await createNotification({
    userId: parsed.data.userId,
    type: "project_added",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "A teammate",
    projectId: id,
    body: `added you to “${project.name}”`,
  });

  return NextResponse.json({ ok: true });
}

const delSchema = z.object({ userId: z.string().min(1) });

// Remove a member. Owner removes anyone; a member may remove themselves.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = delSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const isOwner = project.userId === session.user.id;
  const isSelf = parsed.data.userId === session.user.id;
  if (!isOwner && !isSelf) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, parsed.data.userId)));

  return NextResponse.json({ ok: true });
}
