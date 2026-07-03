import "server-only";
import type { ActionItem } from "@/db/schema";

// Post a note summary to a Slack incoming webhook. The webhook URL is stored
// per-user in the integrations table; nothing here needs a Slack app.
export async function sendToSlack(
  webhookUrl: string,
  payload: { title: string; summary: string | null; actionItems: ActionItem[]; noteUrl?: string }
) {
  const lines: string[] = [`*${payload.title}*`];
  if (payload.summary) lines.push(payload.summary);
  if (payload.actionItems.length) {
    lines.push("", "*Action items*");
    for (const a of payload.actionItems) {
      lines.push(`• ${a.task}${a.owner ? `  _(${a.owner})_` : ""}`);
    }
  }
  if (payload.noteUrl) lines.push("", `<${payload.noteUrl}|Open in GlaciaNav>`);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  if (!res.ok) {
    throw new Error(`Slack responded ${res.status}`);
  }
}

export function isSlackWebhook(url: string): boolean {
  return /^https:\/\/hooks\.slack\.com\/services\//.test(url);
}
