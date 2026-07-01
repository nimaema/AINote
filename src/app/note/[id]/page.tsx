import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, transcripts, results, qaMessages } from "@/db/schema";
import type { Utterance } from "@/db/schema";
import { getIntegration } from "@/lib/integrations";
import { AppHeader } from "@/components/app-header";
import { AudioPlayer } from "@/components/note/audio-player";
import { QAPanel } from "@/components/note/qa-panel";
import { ProcessingView } from "@/components/note/processing-view";
import { ExportMenu } from "@/components/note/export-menu";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  ListChecks,
  Flag,
  Hash,
  Question,
} from "@phosphor-icons/react/dist/ssr";

const SPEAKER_COLORS = [
  "var(--color-accent)",
  "var(--color-aurora-violet)",
  "var(--color-aurora-teal)",
  "var(--color-aurora-rose)",
  "var(--color-warn)",
];

function speakerColor(speaker: string, order: string[]) {
  const idx = order.indexOf(speaker);
  return SPEAKER_COLORS[(idx < 0 ? 0 : idx) % SPEAKER_COLORS.length];
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
  });
  if (!rec) notFound();

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink"
        >
          <ArrowLeft size={15} /> All captures
        </Link>

        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-bold tracking-tight text-ink sm:text-[32px]">
              {rec.title ?? "Untitled recording"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-faint">
              <span>{new Date(rec.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              {rec.durationSec ? <span>· {fmtMs(rec.durationSec * 1000)}</span> : null}
              <span>· {rec.source === "record" ? "Recorded" : "Uploaded"}</span>
            </div>
          </div>
          {rec.status === "done" && (
            <ExportMenu recordingId={rec.id} connections={await exportConnections(session.user.id)} />
          )}
        </div>

        {rec.status !== "done" ? (
          <ProcessingView recordingId={rec.id} initialStatus={rec.status} />
        ) : (
          <NoteBody recordingId={rec.id} durationSec={rec.durationSec} />
        )}
      </main>
    </div>
  );
}

async function NoteBody({
  recordingId,
  durationSec,
}: {
  recordingId: string;
  durationSec: number | null;
}) {
  const [tr, res, history] = await Promise.all([
    db.query.transcripts.findFirst({ where: eq(transcripts.recordingId, recordingId) }),
    db.query.results.findFirst({ where: eq(results.recordingId, recordingId) }),
    db.query.qaMessages.findMany({
      where: eq(qaMessages.recordingId, recordingId),
      orderBy: [asc(qaMessages.createdAt)],
    }),
  ]);

  const utterances = (tr?.utterances ?? []) as Utterance[];
  const speakerOrder = [...new Set(utterances.map((u) => u.speaker))];

  return (
    <div className="space-y-5">
      <AudioPlayer recordingId={recordingId} durationSec={durationSec} />

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Left column: the notes */}
        <div className="space-y-5">
          {res?.summary && (
            <section className="glass rounded-panel p-6">
              <h2 className="font-display text-[15px] font-bold text-ink">Summary</h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                {res.summary}
              </p>
            </section>
          )}

          {res?.actionItems && res.actionItems.length > 0 && (
            <section className="glass rounded-panel p-6">
              <PanelHeading icon={<ListChecks size={16} weight="duotone" />}>
                Action items
              </PanelHeading>
              <ul className="mt-3 space-y-2.5">
                {res.actionItems.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Circle size={18} className="mt-0.5 shrink-0 text-accent-deep" />
                    <span className="text-[14.5px] text-ink-soft">
                      {a.task}
                      {(a.owner || a.due) && (
                        <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                          {a.owner && <Chip>{a.owner}</Chip>}
                          {a.due && <Chip muted>{a.due}</Chip>}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {((res?.decisions?.length ?? 0) > 0 ||
            (res?.topics?.length ?? 0) > 0 ||
            (res?.followUps?.length ?? 0) > 0) && (
            <section className="glass rounded-panel p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {res?.decisions && res.decisions.length > 0 && (
                  <div>
                    <PanelHeading icon={<CheckCircle size={16} weight="duotone" />}>
                      Decisions
                    </PanelHeading>
                    <ul className="mt-3 space-y-2 text-[14px] text-ink-soft">
                      {res.decisions.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {res?.followUps && res.followUps.length > 0 && (
                  <div>
                    <PanelHeading icon={<Flag size={16} weight="duotone" />}>
                      Follow-ups
                    </PanelHeading>
                    <ul className="mt-3 space-y-2 text-[14px] text-ink-soft">
                      {res.followUps.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-violet" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {res?.topics && res.topics.length > 0 && (
                <div className="mt-5 border-t border-hairline pt-5">
                  <PanelHeading icon={<Hash size={16} weight="duotone" />}>Topics</PanelHeading>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {res.topics.map((t, i) => (
                      <Chip key={i}>{t}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Transcript */}
          <section className="glass rounded-panel p-6">
            <PanelHeading icon={<Question size={16} weight="duotone" />}>
              Transcript
            </PanelHeading>
            {utterances.length > 0 ? (
              <div className="mt-4 max-h-[520px] space-y-4 overflow-y-auto pr-2">
                {utterances.map((u, i) => {
                  const color = speakerColor(u.speaker, speakerOrder);
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-24 shrink-0 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                          <span className="truncate text-[12.5px] font-medium text-ink">
                            {u.speaker}
                          </span>
                        </div>
                        <span className="tabular font-mono text-[11px] text-faint">
                          {fmtMs(u.start)}
                        </span>
                      </div>
                      <p className="flex-1 text-[14.5px] leading-relaxed text-ink-soft">
                        {u.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-soft">
                {tr?.text}
              </p>
            )}
          </section>
        </div>

        {/* Right column: Q&A (sticky on desktop) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <QAPanel
            recordingId={recordingId}
            initialMessages={history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

async function exportConnections(userId: string) {
  const [g, t] = await Promise.all([
    getIntegration(userId, "google"),
    getIntegration(userId, "teams"),
  ]);
  return { google: !!g?.accessToken, teams: !!t?.config?.webhookUrl };
}

function PanelHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-accent-deep">
      {icon}
      <h2 className="font-display text-[15px] font-bold text-ink">{children}</h2>
    </div>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-[12px] font-medium ${
        muted ? "bg-[rgba(20,22,28,0.06)] text-muted" : "bg-accent-wash text-accent-deep"
      }`}
    >
      {children}
    </span>
  );
}
