import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projectQaMessages } from "@/db/schema";
import { getAccessibleProject } from "@/lib/projects-server";
import { retrieveProject } from "@/lib/qa";
import { streamingAnswer, streamText } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ question: z.string().min(1).max(2000) });

// Ask a question across every recording in a project. Any project member.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getAccessibleProject(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A question is required" }, { status: 400 });
  const question = parsed.data.question.trim();

  const { context, citations, message } = await retrieveProject(id, question);
  await db.insert(projectQaMessages).values({ projectId: id, role: "user", content: question });
  const persist = async (full: string) => {
    await db.insert(projectQaMessages).values({ projectId: id, role: "assistant", content: full, citations });
  };

  return message
    ? streamText(message, citations, persist)
    : streamingAnswer(question, context, citations, persist);
}
