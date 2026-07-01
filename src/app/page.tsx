import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { relativeTime, humanDuration, humanTotalTime } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { Waveform } from "@/components/waveform";
import { RecordingsList, type RecItem } from "@/components/dashboard/recordings-list";
import { Microphone, UploadSimple } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalDuration: sql<number>`coalesce(sum(${recordings.durationSec}), 0)::int`,
      ready: sql<number>`count(*) filter (where ${recordings.status} = 'done')::int`,
      failed: sql<number>`count(*) filter (where ${recordings.status} = 'failed')::int`,
    })
    .from(recordings)
    .where(eq(recordings.userId, userId));

  const rows = await db.query.recordings.findMany({
    where: eq(recordings.userId, userId),
    orderBy: [desc(recordings.createdAt)],
    limit: 200,
  });

  const now = new Date();
  const items: RecItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled recording",
    status: r.status,
    source: r.source,
    dateLabel: relativeTime(r.createdAt, now),
    durationLabel: humanDuration(r.durationSec),
  }));

  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[@ ]/)[0];

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {/* Hero */}
        <section className="glass rise relative overflow-hidden rounded-panel p-7 sm:p-9">
          <div className="relative z-10 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-deep">Console</p>
            <h1 className="mt-3 font-display text-[30px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[38px]">
              Hi {firstName}. Turn a conversation into <span className="accent-gradient">notes</span>.
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/record?mode=record"
                className="inline-flex h-11 items-center gap-2 rounded-btn bg-ink px-5 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(20,24,40,0.12),0_12px_30px_-10px_rgba(14,165,233,0.6)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <Microphone size={17} weight="fill" /> Record now
              </Link>
              <Link
                href="/record?mode=upload"
                className="glass inline-flex h-11 items-center gap-2 rounded-btn px-5 text-[14px] font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <UploadSimple size={17} /> Upload a file
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 bottom-0 top-0 hidden w-[42%] items-center opacity-90 md:flex">
            <Waveform bars={60} height={130} className="w-full" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] md:block"
            style={{ background: "linear-gradient(90deg, var(--color-panel) 0%, transparent 42%)" }}
          />
        </section>

        {/* Stats readout */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Captures" value={String(stats.total)} />
          <Stat label="Total time" value={humanTotalTime(stats.totalDuration)} />
          <Stat label="Ready" value={String(stats.ready)} accent />
          <Stat label="Needs attention" value={String(stats.failed)} alert={stats.failed > 0} />
        </div>

        <RecordingsList items={items} />
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  alert,
}: {
  label: string;
  value: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="glass-soft rounded-card px-4 py-3.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p
        className={`tabular mt-1 font-display text-[24px] font-bold ${
          alert ? "text-err" : accent ? "text-accent-deep" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
