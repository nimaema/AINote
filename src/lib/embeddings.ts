import type { Utterance } from "../db/schema";

// bge-small-en-v1.5 → 384-dim sentence embeddings, run locally on CPU via
// transformers.js. The model downloads once and is cached; the pipeline is
// lazily created and reused across calls.
type Extractor = (
  text: string,
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false; // always resolve from the hub/cache
      const model = process.env.EMBEDDING_MODEL ?? "Xenova/bge-small-en-v1.5";
      return (await pipeline("feature-extraction", model)) as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const out: number[][] = [];
  for (const t of texts) {
    const res = await extractor(t, { pooling: "mean", normalize: true });
    out.push(Array.from(res.data));
  }
  return out;
}

// bge retrieval works best with an instruction prefix on the *query* only.
export async function embedQuery(query: string): Promise<number[]> {
  const [v] = await embed([
    `Represent this sentence for searching relevant passages: ${query}`,
  ]);
  return v;
}

export type Chunk = {
  idx: number;
  content: string;
  startMs: number | null;
  speaker: string | null;
};

// Group utterances into ~maxChars windows so each chunk keeps a speaker turn
// intact and carries a timestamp for citations. Falls back to splitting raw
// text when no diarization is available.
export function chunkTranscript(
  utterances: Utterance[] | null | undefined,
  fullText: string,
  maxChars = 900
): Chunk[] {
  const chunks: Chunk[] = [];

  if (utterances && utterances.length) {
    let buf = "";
    let startMs: number | null = null;
    let speaker: string | null = null;
    const flush = () => {
      if (buf.trim()) {
        chunks.push({ idx: chunks.length, content: buf.trim(), startMs, speaker });
      }
      buf = "";
      startMs = null;
      speaker = null;
    };
    for (const u of utterances) {
      const line = `${u.speaker}: ${u.text}`;
      if (buf && buf.length + line.length > maxChars) flush();
      if (!buf) {
        startMs = u.start;
        speaker = u.speaker;
      }
      buf += (buf ? "\n" : "") + line;
    }
    flush();
    return chunks;
  }

  // No utterances: window the raw text.
  for (let i = 0; i < fullText.length; i += maxChars) {
    chunks.push({
      idx: chunks.length,
      content: fullText.slice(i, i + maxChars).trim(),
      startMs: null,
      speaker: null,
    });
  }
  return chunks.filter((c) => c.content);
}
