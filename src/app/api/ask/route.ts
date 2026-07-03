import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceQaMessages } from "@/db/schema";
import { answerWorkspaceQuestion } from "@/lib/qa";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ question: z.string().min(1).max(2000) });

// Workspace-wide Q&A: ask one question across everything you can access.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A question is required" }, { status: 400 });
  }
  const question = parsed.data.question.trim();

  await db.insert(workspaceQaMessages).values({ userId, role: "user", content: question });

  try {
    const { answer, citations } = await answerWorkspaceQuestion(userId, question);
    const [msg] = await db
      .insert(workspaceQaMessages)
      .values({ userId, role: "assistant", content: answer, citations })
      .returning();
    return NextResponse.json({ answer, citations, id: msg.id, createdAt: msg.createdAt });
  } catch (err) {
    console.error("workspace ask failed", err);
    return NextResponse.json(
      { error: "Couldn't answer that right now. Please try again." },
      { status: 500 }
    );
  }
}
