import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// Shared across HMR reloads in dev so we don't leak connections.
const g = globalThis as unknown as {
  _redis?: IORedis;
  _pipeline?: Queue;
};

export const redisConnection =
  g._redis ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    // Don't connect at import — only when a job is actually enqueued. Keeps
    // `next build` from reaching for Redis while collecting page data.
    lazyConnect: true,
  });
if (process.env.NODE_ENV !== "production") g._redis = redisConnection;

export const PIPELINE_QUEUE = "pipeline";

export const pipelineQueue =
  g._pipeline ??
  new Queue(PIPELINE_QUEUE, {
    // BullMQ bundles its own ioredis copy; the instance is runtime-compatible,
    // only the duplicated types differ.
    connection: redisConnection as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 1000,
    },
  });
if (process.env.NODE_ENV !== "production") g._pipeline = pipelineQueue;

export type PipelineJob = { recordingId: string };

export function enqueueTranscribe(recordingId: string) {
  return pipelineQueue.add("transcribe", { recordingId } satisfies PipelineJob);
}

export function enqueueProcess(recordingId: string) {
  return pipelineQueue.add("process", { recordingId } satisfies PipelineJob);
}
