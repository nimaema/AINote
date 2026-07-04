// One-off P10 backfill. Run after migrating:
//   npx tsx --env-file=.env src/db/backfill-p10.ts
// Idempotent: safe to run more than once.
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  projects,
  projectMembers,
  recordings,
  results,
  transcripts,
  actionItems,
} from "./schema";
import { traceMatch } from "../lib/trace";

async function main() {
  // 1) Every project's creator becomes an `owner` member.
  const allProjects = await db
    .select({ id: projects.id, userId: projects.userId })
    .from(projects);
  for (const p of allProjects) {
    await db
      .insert(projectMembers)
      .values({ projectId: p.id, userId: p.userId, role: "owner" })
      .onConflictDoNothing();
  }
  console.log(`✓ ensured owner membership for ${allProjects.length} projects`);

  // 2) Promote results.actionItems jsonb → action_items rows (where missing).
  const recs = await db.select({ id: recordings.id }).from(recordings);
  let inserted = 0;
  for (const rec of recs) {
    const existing = await db
      .select({ id: actionItems.id })
      .from(actionItems)
      .where(eq(actionItems.recordingId, rec.id))
      .limit(1);
    if (existing.length) continue;

    const res = await db.query.results.findFirst({
      where: eq(results.recordingId, rec.id),
    });
    const items = res?.actionItems ?? [];
    if (items.length === 0) continue;

    const tr = await db.query.transcripts.findFirst({
      where: eq(transcripts.recordingId, rec.id),
    });
    const utts = tr?.utterances ?? [];

    await db.insert(actionItems).values(
      items.map((a, i) => ({
        recordingId: rec.id,
        task: a.task,
        ownerLabel: a.owner ?? null,
        dueLabel: a.due ?? null,
        sourceMs: traceMatch(a.task, utts),
        orderIdx: i,
      }))
    );
    inserted += items.length;
  }
  console.log(`✓ backfilled ${inserted} action_items rows`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
