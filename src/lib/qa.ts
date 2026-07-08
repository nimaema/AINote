import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { recordings, transcripts } from "../db/schema";
import type { Citation } from "../db/schema";
import { answerQuestion } from "./deepseek";
import { embedQuery } from "./embeddings";
import { accessibleRecordingsCondition } from "./access";

const QA_THRESHOLD = Number(process.env.QA_RETRIEVAL_THRESHOLD ?? 12000);
const PROJECT_CONTEXT_CAP = 18000; // chars fed to the model for a project answer
const WORKSPACE_CONTEXT_CAP = 24000; // chars fed to the model for a workspace answer

// Retrieval returns the context + citations for a question. `message` is set
// when there's nothing to answer over (streamed to the user verbatim).
export type Retrieval = { context: string; citations: Citation[]; message?: string };

// ─── Single recording ─────────────────────────────────────────────────
// Short transcripts use the full text; long ones use pgvector over chunks.
export async function retrieveRecording(
  recordingId: string,
  question: string
): Promise<Retrieval> {
  const tr = await db.query.transcripts.findFirst({
    where: eq(transcripts.recordingId, recordingId),
  });
  if (!tr?.text) {
    return { context: "", citations: [], message: "This recording hasn't finished transcribing yet." };
  }

  if (tr.text.length <= QA_THRESHOLD) {
    return { context: tr.text, citations: [] };
  }

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

  return {
    context: rows.map((r) => r.content).join("\n\n"),
    citations: rows.map((r) => ({ chunkIdx: r.idx, startMs: r.start_ms, speaker: r.speaker })),
  };
}

// ─── One project (cross-recording) ────────────────────────────────────
export async function retrieveProject(
  projectId: string,
  question: string
): Promise<Retrieval> {
  const recs = await db
    .select({ id: recordings.id, title: recordings.title, text: transcripts.text })
    .from(recordings)
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .where(eq(recordings.projectId, projectId));

  const withText = recs.filter((r) => r.text && r.text.trim());
  if (!withText.length) {
    return {
      context: "",
      citations: [],
      message: "There are no transcribed recordings in this topic yet. Add a few recordings and try again.",
    };
  }

  const totalLen = withText.reduce((n, r) => n + (r.text?.length ?? 0), 0);
  if (totalLen <= QA_THRESHOLD) {
    return {
      context: withText.map((r) => `# ${r.title ?? "Untitled"}\n${r.text}`).join("\n\n---\n\n"),
      citations: [],
    };
  }

  const qvec = await embedQuery(question);
  const literal = `[${qvec.join(",")}]`;
  const rows = (await db.execute(sql`
    select c.idx, c.content, c.start_ms, c.speaker, c.recording_id, r.title
    from transcript_chunks c
    join recordings r on r.id = c.recording_id
    where r.project_id = ${projectId}
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
  const citations: Citation[] = rows.map((r) => ({
    chunkIdx: r.idx,
    startMs: r.start_ms,
    speaker: r.speaker,
    recordingId: r.recording_id,
    recordingTitle: r.title,
  }));
  const shortCtx = withText
    .filter((r) => (r.text?.length ?? 0) <= QA_THRESHOLD)
    .map((r) => `# ${r.title ?? "Untitled"}\n${r.text}`)
    .join("\n\n---\n\n");

  return {
    context: [chunkCtx, shortCtx].filter(Boolean).join("\n\n---\n\n").slice(0, PROJECT_CONTEXT_CAP),
    citations,
  };
}

// ─── Whole workspace (everything the user can access) ─────────────────
export async function retrieveWorkspace(userId: string, question: string): Promise<Retrieval> {
  const cond = await accessibleRecordingsCondition(userId);
  const recs = await db
    .select({ id: recordings.id, title: recordings.title, text: transcripts.text })
    .from(recordings)
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .where(cond)
    .orderBy(desc(recordings.createdAt))
    .limit(60);

  const withText = recs.filter((r) => r.text && r.text.trim());
  if (!withText.length) {
    return {
      context: "",
      citations: [],
      message:
        "There are no transcribed recordings you can access yet. Capture or get one shared with you, then ask again.",
    };
  }

  let total = 0;
  const parts: string[] = [];
  for (const r of withText) {
    const piece = `# ${r.title ?? "Untitled"}\n${r.text}`;
    if (total + piece.length > WORKSPACE_CONTEXT_CAP && parts.length) break;
    parts.push(piece);
    total += piece.length;
  }
  return { context: parts.join("\n\n---\n\n").slice(0, WORKSPACE_CONTEXT_CAP), citations: [] };
}

// ─── Non-streaming wrappers (kept for any direct callers) ─────────────
export async function answerRecordingQuestion(recordingId: string, question: string) {
  const r = await retrieveRecording(recordingId, question);
  const answer = r.message ?? (await answerQuestion(question, r.context));
  return { answer, citations: r.citations };
}

export async function answerProjectQuestion(projectId: string, question: string) {
  const r = await retrieveProject(projectId, question);
  const answer = r.message ?? (await answerQuestion(question, r.context));
  return { answer, citations: r.citations };
}

export async function answerWorkspaceQuestion(userId: string, question: string) {
  const r = await retrieveWorkspace(userId, question);
  const answer = r.message ?? (await answerQuestion(question, r.context));
  return { answer, citations: r.citations };
}
