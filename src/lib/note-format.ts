import type { ActionItem, Utterance } from "../db/schema";

// Pure formatting helpers shared by the Markdown and PDF exporters. No DB / no
// server-only imports, so this module is safe to import from the PDF renderer
// (and from standalone preview scripts).

export type NoteExport = {
  title: string;
  createdAt: Date;
  durationSec: number | null;
  language: string | null; // friendly name
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  topics: string[];
  followUps: string[];
  utterances: Utterance[]; // speaker labels already mapped to display names
  transcriptText: string;
};

export function fmtDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function metaLine(n: NoteExport) {
  const date = n.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const parts = [date];
  const dur = fmtDuration(n.durationSec);
  if (dur) parts.push(dur);
  if (n.language) parts.push(n.language);
  return parts.join(" · ");
}

export function actionItemLine(a: ActionItem) {
  const meta = [a.owner, a.due].filter(Boolean).join(", ");
  return meta ? `${a.task} (${meta})` : a.task;
}

// Distinct speakers, in order of first appearance, for a legend.
export function speakerRoster(n: NoteExport): string[] {
  return [...new Set(n.utterances.map((u) => u.speaker))];
}

export function safeFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "note"
  );
}

function mdCell(v?: string | null) {
  return (v ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ─── Markdown ──────────────────────────────────────────────────────────
// Structured, front-matter'd Markdown that reads well raw and renders richly.
export function toMarkdown(n: NoteExport): string {
  const L: string[] = [];
  const created = n.createdAt.toISOString();

  // YAML front matter — picked up by Obsidian, Notion imports, static gens.
  L.push("---");
  L.push(`title: ${JSON.stringify(n.title)}`);
  L.push(`date: ${created}`);
  if (n.durationSec) L.push(`duration: ${fmtDuration(n.durationSec)}`);
  if (n.language) L.push(`language: ${n.language}`);
  if (n.topics.length) L.push(`topics: [${n.topics.map((t) => JSON.stringify(t)).join(", ")}]`);
  L.push("generated_by: GlaciaNav Notes");
  L.push("---", "");

  L.push(`# ${n.title}`, "");
  L.push(`\`${metaLine(n)}\``, "");

  if (n.summary) {
    L.push("## Summary", "");
    for (const line of n.summary.split("\n")) L.push(`> ${line}`);
    L.push("");
  }

  if (n.actionItems.length) {
    L.push("## Action items", "");
    L.push("| Task | Owner | Due |", "| --- | --- | --- |");
    for (const a of n.actionItems) {
      L.push(`| ${mdCell(a.task)} | ${mdCell(a.owner)} | ${mdCell(a.due)} |`);
    }
    L.push("");
  }

  if (n.decisions.length) {
    L.push("## Decisions", "");
    for (const d of n.decisions) L.push(`- ${d}`);
    L.push("");
  }

  if (n.followUps.length) {
    L.push("## Follow-ups", "");
    for (const f of n.followUps) L.push(`- [ ] ${f}`);
    L.push("");
  }

  if (n.topics.length) {
    L.push("## Topics", "");
    L.push(n.topics.map((t) => `\`${t}\``).join(" "), "");
  }

  L.push("## Transcript", "");
  if (n.utterances.length) {
    for (const u of n.utterances) {
      L.push(`**${u.speaker}** · \`${fmtClock(u.start)}\``, "");
      L.push(u.text, "");
    }
  } else if (n.transcriptText) {
    L.push(n.transcriptText, "");
  }

  L.push(
    "---",
    `*Exported from GlaciaNav Notes on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.*`
  );
  return L.join("\n");
}
