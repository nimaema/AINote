// Opt-in data retention. Deletes recordings (and, via cascade, their
// transcripts / results / chunks / Q&A) older than RETENTION_DAYS, and removes
// their audio from storage. Safe by default: does nothing unless RETENTION_DAYS
// is set, and only reports (dry run) unless PRUNE_CONFIRM=1.
//
//   docker compose run --rm -e RETENTION_DAYS=90 worker npx tsx src/db/prune.ts
//   docker compose run --rm -e RETENTION_DAYS=90 -e PRUNE_CONFIRM=1 worker npx tsx src/db/prune.ts
import { eq, lt } from "drizzle-orm";
import { db } from "./index";
import { recordings } from "./schema";
import { removeObject } from "../lib/storage";

async function main() {
  const days = Number(process.env.RETENTION_DAYS);
  if (!days || days <= 0) {
    console.log("Retention disabled (set RETENTION_DAYS to enable).");
    process.exit(0);
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const stale = await db
    .select({ id: recordings.id, storageKey: recordings.storageKey })
    .from(recordings)
    .where(lt(recordings.createdAt, cutoff));

  const confirm = process.env.PRUNE_CONFIRM === "1";
  console.log(
    `${stale.length} recording(s) older than ${days} days` +
      (confirm ? "" : " — DRY RUN (set PRUNE_CONFIRM=1 to delete)")
  );
  if (!confirm || stale.length === 0) process.exit(0);

  let removed = 0;
  for (const r of stale) {
    await removeObject(r.storageKey).catch((e) =>
      console.warn(`  could not remove object ${r.storageKey}: ${e?.message}`)
    );
    await db.delete(recordings).where(eq(recordings.id, r.id));
    removed++;
  }
  console.log(`✓ pruned ${removed} recording(s)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
