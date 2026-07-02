import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { recordings, transcripts } from "../db/schema";
import type { Citation } from "../db/schema";
import { answerQuestion } from "./deepseek";
import { embedQuery } from "./embeddings";

const QA_THRESHOLD = Number(process.env.QA_RETRIEVAL_THRESHOLD ?? 12000);
const PROJECT_CONTEXT_CAP = 18000; // chars fed to the model for a project answer

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

// Answers a question across every recording in a project. Small projects use
// the full concatenated transcripts; larger ones use pgvector similarity over
// the chunked (long) recordings plus the full text of the short ones. Citations
// name the source recording so the UI can link back to it.
export async function answerProjectQuestion(
  projectId: string,
  userId: string,
  question: string
): Promise<{ answer: string; citations: Citation[] }> {
  const recs = await db
    .select({ id: recordings.id, title: recordings.title, text: transcripts.text })
    .from(recordings)
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .where(and(eq(recordings.projectId, projectId), eq(recordings.userId, userId)));

  const withText = recs.filter((r) => r.text && r.text.trim());
  if (!withText.length) {
    return {
      answer:
        "There are no transcribed recordings in this project yet. Add a few recordings and try again.",
      citations: [],
    };
  }

  const totalLen = withText.reduce((n, r) => n + (r.text?.length ?? 0), 0);
  let context: string;
  let citations: Citation[] = [];

  if (totalLen <= QA_THRESHOLD) {
    context = withText
      .map((r) => `# ${r.title ?? "Untitled"}\n${r.text}`)
      .join("\n\n---\n\n");
  } else {
    const qvec = await embedQuery(question);
    const literal = `[${qvec.join(",")}]`;
    const rows = (await db.execute(sql`
      select c.idx, c.content, c.start_ms, c.speaker, c.recording_id, r.title
      from transcript_chunks c
      join recordings r on r.id = c.recording_id
      where r.project_id = ${projectId} and r.user_id = ${userId}
      order by c.embedding <=> ${literal}::vector
      limit 8
    `)) as unknown as Array<{
      idx: number;
      content: string;
      start_ms: number | null;
      speaker: string | null;
      recording_id: string;
      title: string | null;
    }>;

    const chunkCtx = rows.map((r) => `[${r.title ?? "Untitled"}] ${r.content}`).join("\n\n");
    citations = rows.map((r) => ({
      chunkIdx: r.idx,
      startMs: r.start_ms,
      speaker: r.speaker,
      recordingId: r.recording_id,
      recordingTitle: r.title,
    }));

    // Short recordings aren't chunked; fold in their (small) full text.
    const shortCtx = withText
      .filter((r) => (r.text?.length ?? 0) <= QA_THRESHOLD)
      .map((r) => `# ${r.title ?? "Untitled"}\n${r.text}`)
      .join("\n\n---\n\n");

    context = [chunkCtx, shortCtx].filter(Boolean).join("\n\n---\n\n").slice(0, PROJECT_CONTEXT_CAP);
  }

  const answer = await answerQuestion(question, context);
  return { answer, citations };
}
