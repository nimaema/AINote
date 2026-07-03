import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transcripts, results, qaMessages } from "@/db/schema";
import type { Utterance } from "@/db/schema";
import { getAccessibleRecording } from "@/lib/access";
import { languageName } from "@/lib/language";
import { AppShell } from "@/components/shell/app-shell";
import { AudioPlayer } from "@/components/note/audio-player";
import { QAPanel } from "@/components/note/qa-panel";
import { ProcessingView } from "@/components/note/processing-view";
import { ExportMenu } from "@/components/note/export-menu";
import { NoteActions } from "@/components/note/note-actions";
import { VisibilityToggle } from "@/components/note/visibility-toggle";
import { TranscriptPanel } from "@/components/note/transcript-panel";
import {
  ArrowLeft,
  CheckCircle,
  ListChecks,
  Flag,
  Hash,
  Globe,
  Translate,
  FileText,
} from "@phosphor-icons/react/dist/ssr";

const SPEAKER_COLORS = [
  "var(--color-accent)",
  "var(--color-aurora-violet)",
  "var(--color-aurora-teal)",
  "var(--color-aurora-rose)",
  "var(--color-warn)",
];

function makeColorFor(order: string[]) {
  return (raw: string) => {
    const idx = order.indexOf(raw);
    return SPEAKER_COLORS[(idx < 0 ? 0 : idx) % SPEAKER_COLORS.length];
  };
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
  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) notFound();
  const { recording: rec, isOwner } = access;
  const done = rec.status === "done";

  const [tr, res, history] = done
    ? await Promise.all([
        db.query.transcripts.findFirst({ where: eq(transcripts.recordingId, id) }),
        db.query.results.findFirst({ where: eq(results.recordingId, id) }),
        db.query.qaMessages.findMany({
          where: eq(qaMessages.recordingId, id),
          orderBy: [asc(qaMessages.createdAt)],
        }),
      ])
    : [undefined, undefined, []];

  const language = languageName(tr?.language);

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-[1540px] px-3 pb-28 pt-3 sm:px-5 md:px-7 md:pb-12 md:pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink"
        >
          <ArrowLeft size={15} /> All captures
        </Link>

        <div className="mt-3 mb-5 overflow-hidden rounded-[18px] border border-hairline bg-panel-solid">
          <div className="grid gap-px bg-hairline lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="bg-panel-solid p-5 sm:p-6">
              <p className="font-mono text-[11px] text-faint">Review workspace</p>
              <h1 className="mt-2 max-w-5xl text-[28px] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[40px]">
                {rec.title ?? "Untitled recording"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-faint">
                <span>{new Date(rec.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                {rec.durationSec ? <span>{fmtMs(rec.durationSec * 1000)}</span> : null}
                <span>{rec.source === "record" ? "Recorded" : "Uploaded"}</span>
                {language && (
                  <span className="inline-flex items-center gap-1 rounded-btn bg-accent-wash px-2 py-0.5 text-accent-deep">
                    <Translate size={12} weight="bold" /> {language}
                  </span>
                )}
                {!isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-btn bg-panel px-2 py-0.5 text-muted">
                    <Globe size={12} weight="bold" /> Shared with you
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-bg p-4 sm:p-5 lg:min-w-[25rem] lg:justify-end">
              {done && <ExportMenu recordingId={rec.id} />}
              {isOwner && done && (
                <VisibilityToggle recordingId={rec.id} initialPublic={rec.isPublic} />
              )}
              {isOwner && <NoteActions id={rec.id} title={rec.title ?? "Untitled recording"} />}
            </div>
          </div>
        </div>

        {!done ? (
          <ProcessingView recordingId={rec.id} initialStatus={rec.status} />
        ) : (
          <NoteBody
            recordingId={rec.id}
            durationSec={rec.durationSec}
            isOwner={isOwner}
            utterances={(tr?.utterances ?? []) as Utterance[]}
            speakerNames={tr?.speakerNames ?? {}}
            transcriptText={tr?.text ?? ""}
            summary={res?.summary ?? null}
            actionItems={res?.actionItems ?? []}
            decisions={res?.decisions ?? []}
            topics={res?.topics ?? []}
            followUps={res?.followUps ?? []}
            history={history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations,
            }))}
          />
        )}
      </main>
    </AppShell>
  );
}

function NoteBody({
  recordingId,
  durationSec,
  isOwner,
  utterances,
  speakerNames,
  transcriptText,
  summary,
  actionItems,
  decisions,
  topics,
  followUps,
  history,
}: {
  recordingId: string;
  durationSec: number | null;
  isOwner: boolean;
  utterances: Utterance[];
  speakerNames: Record<string, string>;
  transcriptText: string;
  summary: string | null;
  actionItems: { task: string; owner?: string | null; due?: string | null }[];
  decisions: string[];
  topics: string[];
  followUps: string[];
  history: { id: string; role: "user" | "assistant"; content: string; citations?: unknown }[];
}) {
  const speakerOrder = [...new Set(utterances.map((u) => u.speaker))];
  const colorFor = makeColorFor(speakerOrder);
  const speakerColors = Object.fromEntries(speakerOrder.map((sp) => [sp, colorFor(sp)]));
  const noteStats = [
    { label: "Actions", value: String(actionItems.length) },
    { label: "Decisions", value: String(decisions.length) },
    { label: "Follow-ups", value: String(followUps.length) },
    { label: "Speakers", value: String(speakerOrder.length || 1) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AudioPlayer recordingId={recordingId} durationSec={durationSec} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="flex flex-col gap-5">
          <section className="rounded-[18px] border border-hairline bg-panel-solid">
            <div className="grid gap-px bg-hairline sm:grid-cols-4">
              {noteStats.map((item) => (
                <div key={item.label} className="bg-panel-solid px-4 py-3">
                  <p className="font-mono text-[10.5px] text-faint">{item.label}</p>
                  <p className="tabular mt-1 text-[22px] font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {summary && (
            <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
              <PanelHeading icon={<FileText size={17} weight="duotone" />}>
                Note brief
              </PanelHeading>
              <p className="mt-3 max-w-4xl text-[15px] leading-relaxed text-ink-soft">{summary}</p>
            </section>
          )}

          {actionItems.length > 0 && (
            <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
              <PanelHeading icon={<ListChecks size={16} weight="duotone" />}>
                Action board
              </PanelHeading>
              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {actionItems.map((a, i) => (
                  <div key={i} className="rounded-[14px] border border-hairline bg-bg p-3">
                    <p className="text-[14px] leading-relaxed text-ink-soft">
                      {a.task}
                    </p>
                    {(a.owner || a.due) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.owner && <Chip>{a.owner}</Chip>}
                        {a.due && <Chip muted>{a.due}</Chip>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(decisions.length > 0 || topics.length > 0 || followUps.length > 0) && (
            <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {decisions.length > 0 && (
                  <div>
                    <PanelHeading icon={<CheckCircle size={16} weight="duotone" />}>
                      Decisions
                    </PanelHeading>
                    <ul className="mt-3 flex flex-col gap-2 text-[14px] text-ink-soft">
                      {decisions.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {followUps.length > 0 && (
                  <div>
                    <PanelHeading icon={<Flag size={16} weight="duotone" />}>
                      Follow-ups
                    </PanelHeading>
                    <ul className="mt-3 flex flex-col gap-2 text-[14px] text-ink-soft">
                      {followUps.map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {topics.length > 0 && (
                <div className="mt-5 border-t border-hairline pt-5">
                  <PanelHeading icon={<Hash size={16} weight="duotone" />}>Topics</PanelHeading>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <Chip key={i}>{t}</Chip>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <TranscriptPanel
            recordingId={recordingId}
            isOwner={isOwner}
            utterances={utterances}
            transcriptText={transcriptText}
            speakerNames={speakerNames}
            speakerOrder={speakerOrder}
            speakerColors={speakerColors}
          />
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <QAPanel
            endpoint={`/api/recordings/${recordingId}/qa`}
            initialMessages={history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations as never,
            }))}
          />
        </div>
      </div>
    </div>
  );
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
      <h2 className="text-[13.5px] font-semibold text-ink">{children}</h2>
    </div>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-[12px] font-medium ${
        muted ? "bg-panel text-muted" : "bg-accent-wash text-accent-deep"
      }`}
    >
      {children}
    </span>
  );
}
