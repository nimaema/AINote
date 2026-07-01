import type { ActionItem } from "../db/schema";

export type Analysis = {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  topics: string[];
  followUps: string[];
};

const BASE = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
export const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

function apiKey() {
  return process.env.DEEPSEEK_API_KEY ?? "";
}
function useMock() {
  const k = apiKey();
  return process.env.MOCK_LLM === "1" || !k || k === "dev";
}

// Low-level chat helper (also used by Q&A in the note view).
export async function deepseekChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const SYSTEM = `You are a meticulous meeting-notes analyst. You read a transcript and return a compact, accurate JSON object. Never invent facts that aren't supported by the transcript. Output ONLY valid JSON with this exact shape:
{
  "summary": "2-4 sentence plain-English summary of what was discussed and decided",
  "action_items": [{"task": "what needs doing", "owner": "person or null", "due": "when or null"}],
  "decisions": ["each concrete decision made"],
  "topics": ["short topic labels covered"],
  "follow_ups": ["open questions or things to revisit"]
}
Keep arrays tight — omit filler. Use names exactly as they appear. If a field has nothing, use an empty array.`;

export async function analyzeTranscript(text: string): Promise<Analysis> {
  if (useMock()) return mockAnalysis();

  const raw = await deepseekChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Transcript:\n\n${text}` },
    ],
    { json: true, temperature: 0.2 }
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("DeepSeek returned non-JSON output");
  }
  return normalize(parsed);
}

function normalize(p: Record<string, unknown>): Analysis {
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return {
    summary: typeof p.summary === "string" ? p.summary : "",
    actionItems: arr(p.action_items).map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return {
        task: String(o.task ?? o.item ?? "").trim(),
        owner: o.owner ? String(o.owner) : null,
        due: o.due ? String(o.due) : null,
      };
    }).filter((a) => a.task),
    decisions: arr(p.decisions).map(String).filter(Boolean),
    topics: arr(p.topics).map(String).filter(Boolean),
    followUps: arr(p.follow_ups ?? p.followUps).map(String).filter(Boolean),
  };
}

const QA_SYSTEM = `You answer questions about a single recording using ONLY the provided transcript context. Be concise and specific, and attribute points to speakers when it helps. If the answer isn't supported by the transcript, say you don't see it discussed rather than guessing.`;

export async function answerQuestion(
  question: string,
  context: string
): Promise<string> {
  if (useMock()) return mockAnswer(question, context);
  return deepseekChat(
    [
      { role: "system", content: QA_SYSTEM },
      {
        role: "user",
        content: `Transcript context:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
      },
    ],
    { temperature: 0.3 }
  );
}

// Extractive stand-in for local dev: returns the transcript lines that overlap
// most with the question. Good enough to exercise the UI without a real key.
function mockAnswer(question: string, context: string): string {
  const qWords = new Set(question.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const lines = context.split("\n").filter((l) => l.trim());
  const scored = lines
    .map((l) => {
      const words = l.toLowerCase().match(/[a-z]{3,}/g) ?? [];
      let s = 0;
      for (const w of words) if (qWords.has(w)) s++;
      return { l, s };
    })
    .sort((a, b) => b.s - a.s);
  const top = scored.filter((x) => x.s > 0).slice(0, 2).map((x) => x.l);
  if (!top.length) return "I don't see that discussed in this recording.";
  return `Here's what came up about that:\n\n${top.join("\n")}`;
}

// Matches the canned onboarding-sync transcript used in dev.
function mockAnalysis(): Analysis {
  return {
    summary:
      "The team reviewed onboarding drop-off and found most users leave on the calendar permissions screen, which asks for full access up front. They decided to request read-only access first and only ask for write access when a user schedules something, and to add analytics to measure the funnel.",
    actionItems: [
      { task: "Rewrite the permissions screen to request read-only first, write on demand", owner: "Priya", due: "Draft by Thursday" },
      { task: "Add analytics events for reaching vs. granting calendar permissions", owner: "Marcus", due: "End of week" },
    ],
    decisions: [
      "Request read-only calendar access first, write access only when scheduling",
      "Add funnel tracking before measuring the change",
    ],
    topics: ["Onboarding drop-off", "Calendar permissions", "Analytics & funnel tracking"],
    followUps: ["Review the new funnel numbers at next Tuesday's sync"],
  };
}
