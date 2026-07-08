// Rough per-service cost estimates for admin visibility. These are ESTIMATES,
// not billing figures — override the rates via env if your contracts differ.

// AssemblyAI is billed per hour of audio transcribed.
const ASSEMBLYAI_USD_PER_HOUR = Number(process.env.ASSEMBLYAI_USD_PER_HOUR ?? 0.37);

// DeepSeek is billed per token. We don't store exact token counts, so we
// estimate from transcript length (~4 characters per token). The analysis pass
// sends the transcript in and writes a fraction of it back out, plus occasional
// Q&A, so a small multiplier keeps the estimate from running low. Input and
// output are blended into one $/million-token rate.
const DEEPSEEK_USD_PER_MTOK = Number(process.env.DEEPSEEK_USD_PER_MTOK ?? 1.0);
const CHARS_PER_TOKEN = 4;
const LLM_PASS_FACTOR = 1.4;

export type CostBreakdown = { assembly: number; deepseek: number; total: number };

export function estimateCostUSD(durationSec: number, transcriptChars: number): CostBreakdown {
  const assembly = (durationSec / 3600) * ASSEMBLYAI_USD_PER_HOUR;
  const tokens = (transcriptChars / CHARS_PER_TOKEN) * LLM_PASS_FACTOR;
  const deepseek = (tokens / 1_000_000) * DEEPSEEK_USD_PER_MTOK;
  return { assembly, deepseek, total: assembly + deepseek };
}

export function fmtUSD(n: number): string {
  if (n <= 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

export const COST_RATES = {
  assemblyUsdPerHour: ASSEMBLYAI_USD_PER_HOUR,
  deepseekUsdPerMTok: DEEPSEEK_USD_PER_MTOK,
};
