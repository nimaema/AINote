import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getOwnedProject } from "@/lib/projects-server";
import { isProjectColor } from "@/lib/projects";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().refine(isProjectColor).optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "Nothing to update",
  });

// Rename / recolor a project. Owner-only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const fields: { name?: string; color?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) fields.name = parsed.data.name;
  if (parsed.data.color !== undefined) fields.color = parsed.data.color;

  await db.update(projects).set(fields).where(eq(projects.id, id));
  return NextResponse.json({ ok: true });
}

// Delete a project. Its recordings are detached (project_id -> null), not deleted.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ ok: true });
}
