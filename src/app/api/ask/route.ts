import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceQaMessages } from "@/db/schema";
import { retrieveWorkspace } from "@/lib/qa";
import { streamingAnswer, streamText } from "@/lib/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ question: z.string().min(1).max(2000) });

// Workspace-wide Q&A: ask one question across everything you can access.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A question is required" }, { status: 400 });
  const question = parsed.data.question.trim();

  const { context, citations, message } = await retrieveWorkspace(userId, question);
  await db.insert(workspaceQaMessages).values({ userId, role: "user", content: question });
  const persist = async (full: string) => {
    await db.insert(workspaceQaMessages).values({ userId, role: "assistant", content: full, citations });
  };

  return message
    ? streamText(message, citations, persist)
    : streamingAnswer(question, context, citations, persist);
}
