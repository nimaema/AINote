import { AssemblyAI } from "assemblyai";
import { getObjectStream } from "./storage";
import type { Utterance } from "../db/schema";

export type TranscribeResult = {
  assemblyaiId: string | null;
  text: string;
  language: string | null;
  utterances: Utterance[];
};

// Use the canned transcript when there's no real key (local dev / demos).
function useMock() {
  const key = process.env.ASSEMBLYAI_API_KEY;
  return process.env.MOCK_TRANSCRIPTION === "1" || !key || key === "dev";
}

export async function transcribeAudio(
  storageKey: string
): Promise<TranscribeResult> {
  if (useMock()) return mockTranscript();

  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

  // Buffer the audio from storage before handing it to AssemblyAI. Passing a raw
  // S3 stream can upload with no content-length and land as an empty file (which
  // AssemblyAI then "transcribes" to nothing). A Buffer uploads reliably.
  const { body } = await getObjectStream(storageKey);
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);
  if (audio.length === 0) {
    throw new Error("Audio file is empty in storage");
  }

  const t = await client.transcripts.transcribe({
    audio,
    speaker_labels: true,
  });
  if (t.status === "error") {
    throw new Error(t.error ?? "AssemblyAI transcription failed");
  }

  const text = (t.text ?? "").trim();
  if (!text) {
    throw new Error(
      "AssemblyAI returned an empty transcript — the audio may have no clear speech."
    );
  }

  const utterances: Utterance[] = (t.utterances ?? []).map((u) => ({
    speaker: `Speaker ${u.speaker}`,
    text: u.text,
    start: u.start,
    end: u.end,
  }));

  return {
    assemblyaiId: t.id,
    text,
    language: t.language_code ?? null,
    utterances,
  };
}

// A short, realistic product sync so downstream summaries / Q&A have substance.
function mockTranscript(): TranscribeResult {
  const utterances: Utterance[] = [
    { speaker: "Speaker A", start: 800, end: 9200, text: "Alright, thanks for hopping on. The main thing I want to close out today is the onboarding flow — we're still seeing people drop off right after they connect their calendar." },
    { speaker: "Speaker B", start: 9600, end: 18400, text: "Yeah, I dug into the funnel. About forty percent get to the calendar step, but only half of those finish. Most of the drop happens on the permissions screen." },
    { speaker: "Speaker A", start: 18800, end: 25200, text: "That tracks. The permissions copy is scary. It asks for full calendar access up front even though we only need read at first." },
    { speaker: "Speaker C", start: 25600, end: 34800, text: "I can rewrite that screen to request read-only first and ask for write access later, only when someone actually schedules something. That should cut the fear factor." },
    { speaker: "Speaker A", start: 35200, end: 41000, text: "Let's do that. Priya, can you own the copy and the scope change? I'd like it in the next release." },
    { speaker: "Speaker C", start: 41400, end: 44600, text: "Sure, I'll have a draft by Thursday and loop in design." },
    { speaker: "Speaker B", start: 45000, end: 53200, text: "One more thing — we should add an event to track when people hit the permissions screen versus when they grant. Right now we're guessing at where exactly they leave." },
    { speaker: "Speaker A", start: 53600, end: 59800, text: "Good call. Marcus, add the analytics events this sprint so we can measure the change after we ship the new copy." },
    { speaker: "Speaker B", start: 60200, end: 63400, text: "On it. I'll have the events in by end of week." },
    { speaker: "Speaker A", start: 63800, end: 71000, text: "Great. So decision is: read-only first, write on demand, plus proper funnel tracking. Let's reconvene next Tuesday and look at the numbers." },
  ];
  const text = utterances.map((u) => `${u.speaker}: ${u.text}`).join("\n");
  return { assemblyaiId: null, text, language: "en", utterances };
}
