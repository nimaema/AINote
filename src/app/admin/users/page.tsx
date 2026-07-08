import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, recordings, transcripts } from "@/db/schema";
import { relativeTime, humanTotalTime, humanBytes } from "@/lib/format";
import { estimateCostUSD, fmtUSD, COST_RATES } from "@/lib/costs";
import { AppShell } from "@/components/shell/app-shell";
import { UsersAdmin, type UserRow } from "@/components/admin/users-admin";
import { QueueHealth } from "@/components/admin/queue-health";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rows = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    columns: { id: true, name: true, email: true, role: true, active: true },
  });

  // Usage per user, aggregated from recordings. Transcript character length
  // (from the 1:1 transcript row) feeds the rough DeepSeek cost estimate.
  const usage = await db
    .select({
      userId: recordings.userId,
      count: sql<number>`count(*)::int`,
      duration: sql<number>`coalesce(sum(${recordings.durationSec}), 0)::int`,
      bytes: sql<number>`coalesce(sum(${recordings.sizeBytes}), 0)::float8`,
      chars: sql<number>`coalesce(sum(length(coalesce(${transcripts.editedText}, ${transcripts.text}, ''))), 0)::float8`,
      lastAt: sql<string | null>`max(${recordings.createdAt})`,
    })
    .from(recordings)
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .groupBy(recordings.userId);

  const byUser = new Map(usage.map((u) => [u.userId, u]));
  const now = new Date();

  const enriched: UserRow[] = rows.map((u) => {
    const usg = byUser.get(u.id);
    const cost = estimateCostUSD(usg?.duration ?? 0, usg?.chars ?? 0);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      recordings: usg?.count ?? 0,
      timeLabel: humanTotalTime(usg?.duration ?? 0),
      storageLabel: humanBytes(usg?.bytes ?? 0),
      costLabel: fmtUSD(cost.total),
      lastActiveLabel: usg?.lastAt ? relativeTime(usg.lastAt, now) : "never",
    };
  });

  const costTotals = usage.reduce(
    (acc, u) => {
      const c = estimateCostUSD(u.duration, u.chars);
      acc.assembly += c.assembly;
      acc.deepseek += c.deepseek;
      acc.total += c.total;
      return acc;
    },
    { assembly: 0, deepseek: 0, total: 0 }
  );

  const totals = {
    users: rows.length,
    recordings: usage.reduce((a, u) => a + u.count, 0),
    duration: usage.reduce((a, u) => a + u.duration, 0),
    bytes: usage.reduce((a, u) => a + u.bytes, 0),
  };

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        <div className="mb-5 border-b border-hairline px-1 pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Administration</p>
          <h1 className="mt-1.5 font-display text-[23px] font-normal leading-tight text-ink">Users</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Manage access and see how the workspace is being used.
          </p>
        </div>

        <div className="glass mb-5 grid grid-cols-2 overflow-hidden rounded-card sm:grid-cols-4 sm:divide-x sm:divide-hairline max-sm:[&>*]:border-hairline max-sm:[&>*:nth-child(even)]:border-l max-sm:[&>*:nth-child(n+3)]:border-t">
          <Stat label="People" value={String(totals.users)} />
          <Stat label="Recordings" value={String(totals.recordings)} />
          <Stat label="Total time" value={humanTotalTime(totals.duration)} />
          <Stat label="Storage" value={humanBytes(totals.bytes)} />
        </div>

        {/* Rough usage-cost estimate across AssemblyAI + DeepSeek. */}
        <section className="glass mb-5 rounded-panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                Estimated usage cost
              </p>
              <p className="tabular mt-1 font-display text-[30px] leading-none text-ink">
                {fmtUSD(costTotals.total)}
              </p>
            </div>
            <div className="flex gap-5">
              <CostSplit label="AssemblyAI" value={fmtUSD(costTotals.assembly)} note="transcription" />
              <CostSplit label="DeepSeek" value={fmtUSD(costTotals.deepseek)} note="summaries + Q&amp;A" />
            </div>
          </div>
          <p className="mt-3 border-t border-hairline pt-3 text-[12px] leading-relaxed text-faint">
            Rough estimate for internal visibility, not a bill. Based on{" "}
            <span className="font-mono text-muted">${COST_RATES.assemblyUsdPerHour}/hr</span> of audio and{" "}
            <span className="font-mono text-muted">${COST_RATES.deepseekUsdPerMTok}/M</span> tokens (estimated from transcript
            length). Override with{" "}
            <span className="font-mono text-muted">ASSEMBLYAI_USD_PER_HOUR</span> /{" "}
            <span className="font-mono text-muted">DEEPSEEK_USD_PER_MTOK</span>.
          </p>
        </section>

        <QueueHealth />

        <UsersAdmin users={enriched} meId={session.user.id} />
      </main>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[10.5px] text-faint">{label}</p>
      <p className="tabular mt-1 text-[20px] font-semibold tracking-[-0.01em] text-ink">{value}</p>
    </div>
  );
}

function CostSplit({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="text-right">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="tabular mt-0.5 text-[17px] font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-faint">{note}</p>
    </div>
  );
}
