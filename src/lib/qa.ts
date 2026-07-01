import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { transcripts } from "../db/schema";
import type { Citation } from "../db/schema";
import { answerQuestion } from "./deepseek";
import { embedQuery } from "./embeddings";

const QA_THRESHOLD = Number(process.env.QA_RETRIEVAL_THRESHOLD ?? 12000);

// Answers a question about one recording. Short transcripts are answered from
// the full text; long ones use pgvector similarity over the stored chunks.
export async function answerRecordingQuestion(
  recordingId: string,
  question: string
): Promise<{ answer: string; citations: Citation[] }> {
  const tr = await db.query.transcripts.findFirst({
    where: eq(transcripts.recordingId, recordingId),
  });
  if (!tr?.text) {
    return {
      answer: "This recording hasn't finished transcribing yet.",
      citations: [],
    };
  }

  let context = tr.text;
  let citations: Citation[] = [];

  if (tr.text.length > QA_THRESHOLD) {
    const qvec = await embedQuery(question);
    const literal = `[${qvec.join(",")}]`;
    const rows = (await db.execute(sql`
      select idx, content, start_ms, speaker,
             1 - (embedding <=> ${literal}::vector) as score
      from transcript_chunks
      where recording_id = ${recordingId}
      order by embedding <=> ${literal}::vector
      limit 6
    `)) as unknown as Array<{
      idx: number;
      content: string;
      start_ms: number | null;
      speaker: string | null;
    }>;

    context = rows.map((r) => r.content).join("\n\n");
    citations = rows.map((r) => ({
      chunkIdx: r.idx,
      startMs: r.start_ms,
      speaker: r.speaker,
    }));
  }

  const answer = await answerQuestion(question, context);
  return { answer, citations };
}
