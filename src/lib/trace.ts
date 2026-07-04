// Pure source-trace matching: link a note/action string to the utterance it
// most likely came from, by significant-word overlap. No DB, no React — shared
// by the worker (precomputing action_items.sourceMs) and the note client.
// NOTE: no `@/` imports — the worker imports this by relative path.

export type TraceUtterance = { text: string; start: number };

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

export function traceMatch(
  text: string,
  utterances: TraceUtterance[]
): number | null {
  const target = significantWords(text);
  if (target.size === 0) return null;
  let bestStart: number | null = null;
  let bestScore = 0;
  for (const u of utterances) {
    const words = significantWords(u.text);
    let hits = 0;
    for (const w of target) if (words.has(w)) hits++;
    const score = hits / target.size;
    if (score > bestScore) {
      bestScore = score;
      bestStart = u.start;
    }
  }
  return bestScore >= 0.34 ? bestStart : null;
}
