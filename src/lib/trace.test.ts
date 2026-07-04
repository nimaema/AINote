import { test } from "node:test";
import assert from "node:assert/strict";
import { traceMatch } from "./trace";

const utts = [
  { text: "Alright, let's talk about the onboarding flow and where people drop off", start: 1000 },
  { text: "I can rewrite the permissions screen to request read-only access first", start: 2000 },
  { text: "unrelated small talk about the weather and lunch plans today", start: 3000 },
];

test("traceMatch finds the best-overlapping utterance", () => {
  const ms = traceMatch("Rewrite the permissions screen to request read-only first", utts);
  assert.equal(ms, 2000);
});

test("traceMatch returns null when overlap is below threshold", () => {
  const ms = traceMatch("Completely different topic about invoicing quarterly revenue", utts);
  assert.equal(ms, null);
});

test("traceMatch returns null for an empty target", () => {
  assert.equal(traceMatch("", utts), null);
  assert.equal(traceMatch("   ", utts), null);
});

test("traceMatch ignores short stopword-like tokens", () => {
  // 3-char words are dropped, so this shares no significant words.
  assert.equal(traceMatch("the and but for you", utts), null);
});
