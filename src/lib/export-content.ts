import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { recordings, transcripts, results } from "../db/schema";
import type { ActionItem, Utterance } from "../db/schema";

export type NoteExport = {
  title: string;
  createdAt: Date;
  durationSec: number | null;
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  topics: string[];
  followUps: string[];
  utterances: Utterance[];
  transcriptText: string;
};

export async function loadNoteExport(
  recordingId: string,
  userId: string
): Promise<NoteExport | null> {
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, recordingId), eq(recordings.userId, userId)),
  });
  if (!rec) return null;

  const [tr, res] = await Promise.all([
    db.query.transcripts.findFirst({ where: eq(transcripts.recordingId, recordingId) }),
    db.query.results.findFirst({ where: eq(results.recordingId, recordingId) }),
  ]);

  return {
    title: rec.title ?? "Untitled recording",
    createdAt: rec.createdAt,
    durationSec: rec.durationSec,
    summary: res?.summary ?? "",
    actionItems: res?.actionItems ?? [],
    decisions: res?.decisions ?? [],
    topics: res?.topics ?? [],
    followUps: res?.followUps ?? [],
    utterances: (tr?.utterances ?? []) as Utterance[],
    transcriptText: tr?.text ?? "",
  };
}

function fmtDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function metaLine(n: NoteExport) {
  const date = n.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dur = fmtDuration(n.durationSec);
  return dur ? `${date} · ${dur}` : date;
}

function actionItemLine(a: ActionItem) {
  const meta = [a.owner, a.due].filter(Boolean).join(", ");
  return meta ? `${a.task} (${meta})` : a.task;
}

export function toMarkdown(n: NoteExport): string {
  const lines: string[] = [`# ${n.title}`, `_${metaLine(n)}_`, ""];

  if (n.summary) lines.push("## Summary", n.summary, "");
  if (n.actionItems.length) {
    lines.push("## Action items");
    for (const a of n.actionItems) lines.push(`- [ ] ${actionItemLine(a)}`);
    lines.push("");
  }
  if (n.decisions.length) {
    lines.push("## Decisions");
    for (const d of n.decisions) lines.push(`- ${d}`);
    lines.push("");
  }
  if (n.followUps.length) {
    lines.push("## Follow-ups");
    for (const f of n.followUps) lines.push(`- ${f}`);
    lines.push("");
  }
  if (n.topics.length) lines.push("## Topics", n.topics.join(", "), "");

  lines.push("## Transcript");
  if (n.utterances.length) {
    for (const u of n.utterances)
      lines.push(`**${u.speaker}** (${fmtMs(u.start)}): ${u.text}`, "");
  } else if (n.transcriptText) {
    lines.push(n.transcriptText);
  }
  return lines.join("\n");
}

// Plain text for the Google Doc body (headings become their own lines).
export function toPlainText(n: NoteExport): string {
  return toMarkdown(n)
    .replace(/^#+\s*/gm, "")
    .replace(/^\_(.*)\_$/gm, "$1")
    .replace(/^- \[ \] /gm, "• ")
    .replace(/^- /gm, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1");
}

// Adaptive Card for a Teams incoming-webhook / workflow post.
export function toTeamsCard(n: NoteExport, noteUrl: string) {
  const body: unknown[] = [
    { type: "TextBlock", size: "Large", weight: "Bolder", text: n.title, wrap: true },
    { type: "TextBlock", spacing: "None", isSubtle: true, text: metaLine(n), wrap: true },
  ];
  if (n.summary)
    body.push({ type: "TextBlock", text: n.summary, wrap: true, spacing: "Medium" });
  if (n.actionItems.length) {
    body.push({ type: "TextBlock", weight: "Bolder", text: "Action items", spacing: "Medium" });
    body.push({
      type: "TextBlock",
      wrap: true,
      text: n.actionItems.map((a) => `• ${actionItemLine(a)}`).join("\n"),
    });
  }
  if (n.decisions.length) {
    body.push({ type: "TextBlock", weight: "Bolder", text: "Decisions", spacing: "Medium" });
    body.push({ type: "TextBlock", wrap: true, text: n.decisions.map((d) => `• ${d}`).join("\n") });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
          actions: [{ type: "Action.OpenUrl", title: "Open in GlaciaNav", url: noteUrl }],
        },
      },
    ],
  };
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
