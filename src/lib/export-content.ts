import { eq } from "drizzle-orm";
import { db } from "../db";
import { transcripts, results } from "../db/schema";
import type { Utterance } from "../db/schema";
import { getAccessibleRecording } from "./access";
import { languageName } from "./language";
import type { NoteExport } from "./note-format";

// Re-export the pure formatting helpers so existing import sites keep working.
export type { NoteExport } from "./note-format";
export {
  fmtDuration,
  fmtClock,
  metaLine,
  actionItemLine,
  speakerRoster,
  safeFilename,
  toMarkdown,
} from "./note-format";

// Loads everything needed to render an export. Access follows the shared rule
// (owner, or any signed-in user when the recording is public).
export async function loadNoteExport(
  recordingId: string,
  userId: string
): Promise<NoteExport | null> {
  const access = await getAccessibleRecording(recordingId, userId);
  if (!access) return null;
  const rec = access.recording;

  const [tr, res] = await Promise.all([
    db.query.transcripts.findFirst({ where: eq(transcripts.recordingId, recordingId) }),
    db.query.results.findFirst({ where: eq(results.recordingId, recordingId) }),
  ]);

  const names = tr?.speakerNames ?? {};
  const utterances = ((tr?.utterances ?? []) as Utterance[]).map((u) => ({
    ...u,
    speaker: names[u.speaker] ?? u.speaker,
  }));

  return {
    title: rec.title ?? "Untitled recording",
    createdAt: rec.createdAt,
    durationSec: rec.durationSec,
    language: languageName(tr?.language),
    summary: res?.summary ?? "",
    actionItems: res?.actionItems ?? [],
    decisions: res?.decisions ?? [],
    topics: res?.topics ?? [],
    followUps: res?.followUps ?? [],
    utterances,
    transcriptText: tr?.text ?? "",
  };
}
