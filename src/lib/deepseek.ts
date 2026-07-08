import type { ActionItem } from "../db/schema";

export type AnalysisChapter = { title: string; summary: string; quote: string };

export type Analysis = {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  topics: string[];
  followUps: string[];
  chapters: AnalysisChapter[];
};

export class DeepSeekJsonError extends Error {
  constructor(message: string, readonly raw: string) {
    super(message);
    this.name = "DeepSeekJsonError";
  }
}

const BASE = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
export const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";

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
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {}
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
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
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

const SYSTEM = `You are a meticulous meeting-notes analyst. Read the ENTIRE transcript from beginning to end before writing anything — do not stop early, skim, or focus only on the opening. Be thorough and comprehensive: cover the whole conversation, and never invent facts that aren't supported by the transcript.

Output ONLY valid JSON with this exact shape:
{
  "summary": "a thorough 5-8 sentence plain-English summary covering the full arc of the conversation: the context, the main points raised under each topic, any disagreements or trade-offs, and everything that was decided",
  "action_items": [{"task": "what needs doing, specific and self-contained", "owner": "person or null", "due": "when or null"}],
  "decisions": ["every concrete decision or conclusion reached, however small"],
  "topics": ["a short label for each distinct topic covered, in the order it came up"],
  "follow_ups": ["every open question, unresolved issue, or thing to revisit"],
  "chapters": [{"title": "short section title (2-4 words)", "summary": "one-line description of the section", "quote": "a short exact phrase (4-8 words) copied verbatim from the transcript where this section begins"}]
}

Rules:
- Extract EVERY action item, decision, and follow-up mentioned anywhere in the transcript, including ones raised briefly or in passing. Do not merge distinct items or silently drop minor ones.
- Cover the whole timeline with chapters, in order — enough chapters to represent the entire conversation end to end, not just the first few minutes.
- Use names exactly as they appear. Attribute an owner or due date only when the transcript makes it clear; otherwise use null.
- Each chapter quote MUST be copied word-for-word from the transcript so it can be located.
- If a field genuinely has nothing, use an empty array. Prefer completeness over brevity, but never pad with invented content.`;

// Models sometimes wrap JSON in ```json fences or add a sentence of prose even
// in JSON mode. Pull the JSON object out before parsing.
function tryParseJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^\uFEFF/, "");
  const candidates: string[] = [cleaned];

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const balanced = extractFirstJsonObject(cleaned);
  if (balanced) candidates.push(balanced);

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(raw.slice(first, last + 1));

  for (const c of candidates) {
    const parsed = parseCandidate(c);
    if (parsed) return parsed;
  }
  return null;
}

function parseCandidate(candidate: string): Record<string, unknown> | null {
  const variants = [
    candidate,
    candidate
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, "$1"),
  ];

  for (const variant of variants) {
    try {
      const parsed = JSON.parse(variant);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try next variant */
    }
  }
  return null;
}

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') inString = true;
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return raw.slice(start, i + 1);
  }

  return null;
}

export async function analyzeTranscript(text: string): Promise<Analysis> {
  if (useMock()) return mockAnalysis();

  const raw = await deepseekChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Read this full transcript and produce the thorough analysis described.\n\nTranscript:\n\n${text}` },
    ],
    { json: true, temperature: 0.2, maxTokens: 4000 }
  );

  let parsed = tryParseJson(raw);

  // One repair attempt: hand the malformed output back and ask for clean JSON.
  if (!parsed) {
    const repaired = await deepseekChat(
      [
        {
          role: "system",
          content:
            "Return ONLY a single valid JSON object. Do not add prose or code fences. Preserve the meaning and use keys summary, action_items, decisions, topics, follow_ups.",
        },
        { role: "user", content: raw.slice(0, 12000) },
      ],
      { json: true, temperature: 0 }
    );
    parsed = tryParseJson(repaired);
  }

  if (!parsed) throw new DeepSeekJsonError("DeepSeek returned non-JSON output", raw);
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
    chapters: arr(p.chapters)
      .map((it) => {
        const o = (it ?? {}) as Record<string, unknown>;
        return {
          title: String(o.title ?? "").trim(),
          summary: String(o.summary ?? "").trim(),
          quote: String(o.quote ?? "").trim(),
        };
      })
      .filter((c) => c.title && c.quote),
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

// Streaming variant: yields answer text deltas. The mock chunks its extractive
// answer so the UI streams uniformly whether or not a real key is configured.
export async function* answerQuestionStream(
  question: string,
  context: string
): AsyncGenerator<string> {
  if (useMock()) {
    const full = mockAnswer(question, context);
    for (const chunk of full.match(/\S+\s*/g) ?? [full]) {
      await new Promise((r) => setTimeout(r, 12)); // make the dev mock visibly stream
      yield chunk;
    }
    return;
  }

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      stream: true,
      messages: [
        { role: "system", content: QA_SYSTEM },
        {
          role: "user",
          content: `Transcript context:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
        },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* ignore partial frames */
      }
    }
  }
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
    chapters: [
      { title: "Onboarding drop-off", summary: "Where users leave the funnel", quote: "we're still seeing people drop off" },
      { title: "Permissions rewrite", summary: "Read-only first, write on demand", quote: "rewrite that screen to request read-only first" },
      { title: "Funnel tracking", summary: "Instrument the permissions step", quote: "add an event to track when people hit the permissions" },
      { title: "Wrap-up", summary: "Decision and next steps", quote: "So decision is: read-only first" },
    ],
  };
}
