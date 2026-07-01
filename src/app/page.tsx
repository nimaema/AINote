import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { Waveform } from "@/components/waveform";
import {
  Microphone,
  UploadSimple,
  Waveform as WaveIcon,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rows = await db.query.recordings.findMany({
    where: eq(recordings.userId, session.user.id),
    orderBy: [desc(recordings.createdAt)],
    limit: 25,
  });

  const firstName = (session.user.name ?? session.user.email ?? "there").split(
    /[@ ]/
  )[0];

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        {/* Hero — the thesis: your voice becomes notes */}
        <section className="glass rise relative overflow-hidden rounded-panel p-7 sm:p-10">
          <div className="relative z-10 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-deep">
              Console
            </p>
            <h1 className="mt-3 font-display text-[34px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[42px]">
              Hi {firstName}. Let&apos;s turn a<br className="hidden sm:block" />{" "}
              conversation into <span className="accent-gradient">notes</span>.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Record live or drop in a file. It transcribes, summarizes, pulls out
              action items, and becomes something you can question.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/record?mode=record"
                className="inline-flex h-12 items-center gap-2 rounded-btn bg-ink px-6 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(20,24,40,0.12),0_12px_30px_-10px_rgba(14,165,233,0.6)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(20,24,40,0.14),0_18px_38px_-8px_rgba(14,165,233,0.85)] active:scale-[0.98] cursor-pointer"
              >
                <Microphone size={18} weight="fill" />
                Record now
              </Link>
              <Link
                href="/record?mode=upload"
                className="glass inline-flex h-12 items-center gap-2 rounded-btn px-6 text-[15px] font-medium text-ink transition-[transform] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <UploadSimple size={18} />
                Upload a file
              </Link>
            </div>
          </div>

          {/* Signature waveform, bleeding off the right edge */}
          <div className="pointer-events-none absolute -right-6 bottom-0 top-0 hidden w-[46%] items-center opacity-90 md:flex">
            <Waveform bars={64} height={150} className="w-full" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] md:block"
            style={{
              background:
                "linear-gradient(90deg, var(--color-panel) 0%, transparent 40%)",
            }}
          />
        </section>

        {/* Recent */}
        <section aria-labelledby="recent-heading" className="mt-10">
          <div className="mb-4 flex items-baseline justify-between px-1">
            <h2
              id="recent-heading"
              className="font-display text-[18px] font-bold tracking-tight text-ink"
            >
              Recent captures
            </h2>
            {rows.length > 0 && (
              <span className="tabular font-mono text-[12px] text-faint">
                {rows.length} total
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="glass-soft grid gap-px overflow-hidden rounded-panel">
              {rows.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/note/${r.id}`}
                    className="group flex items-center gap-4 bg-white/40 px-5 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-white/75 cursor-pointer"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
                      <WaveIcon size={18} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                      {r.title ?? "Untitled recording"}
                    </span>
                    <StatusPill status={r.status} />
                    <ArrowRight
                      size={16}
                      className="text-faint transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-soft grid place-items-center rounded-panel px-6 py-16 text-center">
      <div className="w-64 rounded-card border border-hairline bg-white/50 px-5 py-3.5">
        <Waveform bars={40} height={52} live={false} />
      </div>
      <p className="mt-6 text-[15px] font-medium text-ink">Nothing captured yet</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted">
        Record or upload audio and your notes, action items, and answers will
        collect here.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    uploaded: { label: "Queued", cls: "bg-[rgba(20,22,28,0.06)] text-muted" },
    transcribing: { label: "Transcribing", cls: "bg-accent-wash text-accent-deep" },
    processing: { label: "Summarizing", cls: "bg-accent-wash text-accent-deep" },
    done: { label: "Ready", cls: "bg-[rgba(14,164,114,0.12)] text-ok" },
    failed: { label: "Failed", cls: "bg-[rgba(229,72,77,0.12)] text-err" },
  };
  const s = map[status] ?? map.uploaded;
  return (
    <span
      className={`shrink-0 rounded-btn px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
