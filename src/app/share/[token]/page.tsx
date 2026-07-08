import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recordings, transcripts, results } from "@/db/schema";
import type { Utterance, ActionItem } from "@/db/schema";
import { SignalMark } from "@/components/brand";
import { dateTimeLabel } from "@/lib/format";
import { languageName } from "@/lib/language";

const SPEAKER_COLORS = [
  "var(--color-accent)",
  "var(--color-aurora-violet)",
  "var(--color-aurora-teal)",
  "var(--color-aurora-rose)",
  "var(--color-warn)",
];

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// Public, read-only view of a shared recording. No sign-in, no editing, no audio.
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const rec = await db.query.recordings.findFirst({
    where: eq(recordings.shareToken, token),
  });
  if (!rec || !rec.shareToken) notFound();

  const [tr, res] = await Promise.all([
    db.query.transcripts.findFirst({ where: eq(transcripts.recordingId, rec.id) }),
    db.query.results.findFirst({ where: eq(results.recordingId, rec.id) }),
  ]);

  const utterances = (tr?.editedUtterances ?? tr?.utterances ?? []) as Utterance[];
  const speakerNames = tr?.speakerNames ?? {};
  const order = [...new Set(utterances.map((u) => u.speaker))];
  const colorFor = (raw: string) => SPEAKER_COLORS[Math.max(0, order.indexOf(raw)) % SPEAKER_COLORS.length];
  const displayName = (raw: string) => speakerNames[raw] ?? raw;
  const actionItems = (res?.actionItems ?? []) as ActionItem[];
  const decisions = res?.decisions ?? [];
  const followUps = res?.followUps ?? [];
  const topics = res?.topics ?? [];
  const chapters = res?.chapters ?? [];
  const language = languageName(tr?.language);

  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-hairline bg-bg-2/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <span className="inline-flex items-center gap-2.5">
            <SignalMark size={20} />
            <span className="font-mono text-[13px] font-bold tracking-[0.08em] text-ink">GLACIA<span className="text-accent">NAV</span></span>
          </span>
          <span className="rounded-pill bg-lock-wash px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lock">
            Shared · read-only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Shared note</p>
        <h1 className="mt-2 font-display text-[22px] font-normal leading-[1.1] text-ink sm:text-[28px]">
          {rec.title ?? "Untitled recording"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-faint">
          <span>{dateTimeLabel(rec.createdAt)}</span>
          {rec.durationSec ? <span>{fmtMs(rec.durationSec * 1000)}</span> : null}
          {language && <span>{language}</span>}
        </div>

        {res?.summary && (
          <section className="mt-8">
            <SectionLabel>Summary</SectionLabel>
            <p className="mt-2 text-[16px] leading-[1.6] text-ink-soft">{res.summary}</p>
          </section>
        )}

        {chapters.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Chapters</SectionLabel>
            <ol className="mt-2 flex flex-col gap-2">
              {chapters.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-pill bg-accent-wash px-2 py-0.5 font-mono text-[11px] text-accent-deep">
                    {fmtMs(c.startMs)}
                  </span>
                  <span>
                    <span className="text-[14px] font-semibold text-ink">{c.title}</span>
                    {c.summary && <span className="ml-1 text-[13px] text-muted">— {c.summary}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {actionItems.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Action items</SectionLabel>
            <ul className="mt-2 flex flex-col gap-2">
              {actionItems.map((a, i) => (
                <li key={i} className="rounded-[12px] border border-hairline bg-panel-solid p-3">
                  <p className="text-[14px] text-ink-soft">{a.task}</p>
                  {(a.owner || a.due) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px] text-faint">
                      {a.owner && <span>{a.owner}</span>}
                      {a.due && <span>· {a.due}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(decisions.length > 0 || followUps.length > 0) && (
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            {decisions.length > 0 && (
              <div>
                <SectionLabel>Decisions</SectionLabel>
                <ul className="mt-2 flex flex-col gap-2 text-[14px] text-ink-soft">
                  {decisions.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lock" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {followUps.length > 0 && (
              <div>
                <SectionLabel>Follow-ups</SectionLabel>
                <ul className="mt-2 flex flex-col gap-2 text-[14px] text-ink-soft">
                  {followUps.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {topics.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Tags</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((t, i) => (
                <span key={i} className="rounded-btn bg-accent-wash px-2.5 py-0.5 text-[12px] font-medium text-accent-deep">
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {utterances.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Transcript</SectionLabel>
            <div className="mt-3 flex flex-col gap-2.5">
              {utterances.map((u, i) => (
                <div key={i} className="grid gap-1 md:grid-cols-[8rem_minmax(0,1fr)]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorFor(u.speaker) }} />
                    <span className="text-[12.5px] font-semibold text-ink">{displayName(u.speaker)}</span>
                    <span className="font-mono text-[11px] text-faint">{fmtMs(u.start)}</span>
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">{u.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 border-t border-hairline pt-5 text-center font-mono text-[11px] text-faint">
          Captured with GlaciaNav Notes
        </p>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-deep">{children}</p>;
}
