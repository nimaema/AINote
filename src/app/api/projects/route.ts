import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { isProjectColor } from "@/lib/projects";

export const runtime = "nodejs";

// List the current user's projects.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: [desc(projects.createdAt)],
  });
  return NextResponse.json({ projects: rows });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().refine(isProjectColor).optional(),
});

// Create a project.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A project name is required" }, { status: 400 });

  const [row] = await db
    .insert(projects)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? "sky",
    })
    .returning();

  return NextResponse.json({ project: row }, { status: 201 });
}
