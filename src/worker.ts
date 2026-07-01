import "dotenv/config";
import { Worker, type Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { recordings, transcripts, results, transcriptChunks } from "./db/schema";
import { transcribeAudio } from "./lib/transcribe";
import { analyzeTranscript, MODEL } from "./lib/deepseek";
import { chunkTranscript, embed } from "./lib/embeddings";
import { enqueueProcess, PIPELINE_QUEUE, type PipelineJob } from "./lib/queue";

const QA_THRESHOLD = Number(process.env.QA_RETRIEVAL_THRESHOLD ?? 12000);

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ─── transcribe: audio → text, then hand off to the process step ──────
async function handleTranscribe(job: Job<PipelineJob>) {
  const { recordingId } = job.data;
  const rec = await db.query.recordings.findFirst({
    where: eq(recordings.id, recordingId),
  });
  if (!rec) return;

  await db
    .update(recordings)
    .set({ status: "transcribing", error: null })
    .where(eq(recordings.id, recordingId));

  const result = await transcribeAudio(rec.storageKey);

  // Idempotent on retry: clear any prior transcript for this recording.
  await db.delete(transcripts).where(eq(transcripts.recordingId, recordingId));
  await db.insert(transcripts).values({
    recordingId,
    assemblyaiId: result.assemblyaiId,
    text: result.text,
    utterances: result.utterances,
    language: result.language,
  });

  await db
    .update(recordings)
    .set({ status: "processing" })
    .where(eq(recordings.id, recordingId));

  await enqueueProcess(recordingId);
}

// ─── process: DeepSeek analysis + Q&A embeddings ──────────────────────
async function handleProcess(job: Job<PipelineJob>) {
  const { recordingId } = job.data;
  const tr = await db.query.transcripts.findFirst({
    where: eq(transcripts.recordingId, recordingId),
  });
  if (!tr?.text) throw new Error("no transcript to process");

  // 1) Summary / action items / decisions / topics via DeepSeek.
  const analysis = await analyzeTranscript(tr.text);
  await db.delete(results).where(eq(results.recordingId, recordingId));
  await db.insert(results).values({
    recordingId,
    summary: analysis.summary,
    actionItems: analysis.actionItems,
    decisions: analysis.decisions,
    topics: analysis.topics,
    followUps: analysis.followUps,
    model: MODEL,
  });

  // 2) Embeddings for Q&A retrieval — only worth it for long transcripts.
  //    Short ones get answered by stuffing the full transcript into context.
  if (tr.text.length > QA_THRESHOLD) {
    const chunks = chunkTranscript(tr.utterances, tr.text);
    const vectors = await embed(chunks.map((c) => c.content));
    await db
      .delete(transcriptChunks)
      .where(eq(transcriptChunks.recordingId, recordingId));
    await db.insert(transcriptChunks).values(
      chunks.map((c, i) => ({
        recordingId,
        idx: c.idx,
        content: c.content,
        startMs: c.startMs,
        speaker: c.speaker,
        embedding: vectors[i],
      }))
    );
    console.log(`  embedded ${chunks.length} chunks for ${recordingId}`);
  }

  await db
    .update(recordings)
    .set({ status: "done" })
    .where(eq(recordings.id, recordingId));
}

const worker = new Worker<PipelineJob>(
  PIPELINE_QUEUE,
  async (job) => {
    if (job.name === "transcribe") return handleTranscribe(job);
    if (job.name === "process") return handleProcess(job);
  },
  { connection: connection as unknown as ConnectionOptions, concurrency: 3 }
);

worker.on("completed", (job) => {
  console.log(`✓ ${job.name} done (${job.data.recordingId})`);
});

worker.on("failed", async (job, err) => {
  console.error(`✗ ${job?.name} failed:`, err?.message);
  const attempts = job?.opts.attempts ?? 1;
  if (job && job.attemptsMade >= attempts) {
    await db
      .update(recordings)
      .set({ status: "failed", error: err?.message?.slice(0, 500) ?? "failed" })
      .where(eq(recordings.id, job.data.recordingId))
      .catch(() => {});
  }
});

worker.on("ready", () => console.log(`✓ worker ready — queue "${PIPELINE_QUEUE}"`));
console.log("worker starting…");

async function shutdown() {
  await worker.close();
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
