import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { qaMessages } from "@/db/schema";
import { getAccessibleRecording } from "@/lib/access";
import { answerRecordingQuestion } from "@/lib/qa";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ question: z.string().min(1).max(2000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A question is required" }, { status: 400 });
  }
  const question = parsed.data.question.trim();

  await db.insert(qaMessages).values({ recordingId: id, role: "user", content: question });

  try {
    const { answer, citations } = await answerRecordingQuestion(id, question);
    const [msg] = await db
      .insert(qaMessages)
      .values({ recordingId: id, role: "assistant", content: answer, citations })
      .returning();
    return NextResponse.json({
      answer,
      citations,
      id: msg.id,
      createdAt: msg.createdAt,
    });
  } catch (err) {
    console.error("qa failed", err);
    return NextResponse.json(
      { error: "Couldn't answer that right now. Please try again." },
      { status: 500 }
    );
  }
}
