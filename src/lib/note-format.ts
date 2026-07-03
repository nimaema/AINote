import type { ActionItem, Utterance } from "../db/schema";
import { asDate, dateTimeLabel, type DateInput } from "./format";

// Pure formatting helpers shared by the Markdown and PDF exporters. No DB / no
// server-only imports, so this module is safe to import from the PDF renderer
// (and from standalone preview scripts).

export type NoteExport = {
  title: string;
  createdAt: DateInput;
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
  const date = dateTimeLabel(n.createdAt);
  const parts = [date];
  const dur = fmtDuration(n.durationSec);
  if (dur) parts.push(dur);
  if (n.language) parts.push(n.language);
  return parts.join(" / ");
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
  return (v ?? "-").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// Markdown
// Structured, front-matter'd Markdown that reads well raw and renders richly in
// GitHub / Obsidian / Notion: a metadata table, callouts, task lists, badges,
// and a collapsible transcript.
export function toMarkdown(n: NoteExport): string {
  const L: string[] = [];
  const created = asDate(n.createdAt)?.toISOString();
  const roster = speakerRoster(n);

  // YAML front matter picked up by Obsidian, Notion imports, static gens.
  L.push("---");
  L.push(`title: ${JSON.stringify(n.title)}`);
  if (created) L.push(`date: ${created}`);
  if (n.durationSec) L.push(`duration: ${fmtDuration(n.durationSec)}`);
  if (n.language) L.push(`language: ${n.language}`);
  if (n.topics.length) L.push(`topics: [${n.topics.map((t) => JSON.stringify(t)).join(", ")}]`);
  L.push("generated_by: GlaciaNav Notes");
  L.push("---", "");

  L.push(`# ${n.title}`, "");

  // Metadata table.
  const dateStr = dateTimeLabel(n.createdAt);
  const rows: [string, string][] = [["Date", dateStr]];
  if (n.durationSec) rows.push(["Duration", fmtDuration(n.durationSec)]);
  if (n.language) rows.push(["Language", n.language]);
  if (roster.length) rows.push(["Speakers", roster.join(", ")]);
  L.push("| | |", "| :-- | :-- |");
  for (const [k, v] of rows) L.push(`| **${k}** | ${mdCell(v)} |`);
  L.push("");

  if (n.summary) {
    L.push("> [!NOTE]", "> **Summary**", ">");
    for (const line of n.summary.split("\n")) L.push(`> ${line}`);
    L.push("");
  }

  if (n.actionItems.length) {
    L.push("## Action items", "");
    for (const a of n.actionItems) {
      const meta = [a.owner, a.due].filter(Boolean).join(" / ");
      L.push(`- [ ] ${a.task}${meta ? `  \`${meta}\`` : ""}`);
    }
    L.push("");
  }

  if (n.decisions.length) {
    L.push("> [!IMPORTANT]", "> **Decisions**", ">");
    for (const d of n.decisions) L.push(`> - ${d}`);
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

  // Transcript in a collapsible so long notes stay scannable.
  L.push("## Transcript", "");
  if (n.utterances.length) {
    L.push("<details>", `<summary>${n.utterances.length} turns / click to expand</summary>`, "");
    for (const u of n.utterances) {
      L.push(`**${u.speaker}** &nbsp;\`${fmtClock(u.start)}\``, "");
      L.push(u.text, "");
    }
    L.push("</details>", "");
  } else if (n.transcriptText) {
    L.push(n.transcriptText, "");
  }

  L.push(
    "---",
    `<sub>Exported from **GlaciaNav Notes** on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.</sub>`
  );
  return L.join("\n");
}
