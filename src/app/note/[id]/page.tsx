import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transcripts, results, qaMessages, users, actionItems } from "@/db/schema";
import type { Utterance, Citation } from "@/db/schema";
import type { ActionRow } from "@/components/note/action-board";
import { getAccessibleRecording } from "@/lib/access";
import { languageName } from "@/lib/language";
import { dateTimeLabel } from "@/lib/format";
import { AppShell } from "@/components/shell/app-shell";
import { ProcessingView } from "@/components/note/processing-view";
import { ExportMenu } from "@/components/note/export-menu";
import { NoteActions } from "@/components/note/note-actions";
import { VisibilityToggle } from "@/components/note/visibility-toggle";
import { ShareLink } from "@/components/note/share-link";
import { NoteWorkspace } from "@/components/note/note-workspace";
import { ArrowLeft, Globe, Translate } from "@phosphor-icons/react/dist/ssr";

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

  // Shared captures show who captured them — the team read view.
  let sharedBy: string | null = null;
  if (!isOwner) {
    const author = await db.query.users.findFirst({
      where: eq(users.id, rec.userId),
      columns: { name: true, email: true },
    });
    sharedBy = author?.name ?? author?.email?.split("@")[0] ?? "a teammate";
  }

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

  const utterances = (tr?.editedUtterances ?? tr?.utterances ?? []) as Utterance[];
  const transcriptText = tr?.editedText ?? tr?.text ?? "";
  // The re-resolve prompt only matters while the transcript has been edited
  // *since* the notes were last generated.
  const transcriptEdited =
    tr?.editedAt != null &&
    (!res?.createdAt || tr.editedAt.getTime() > res.createdAt.getTime());
  const notesEditedBy = res?.editedAt ? res?.editedBy ?? "a teammate" : null;
  const speakerOrder = [...new Set(utterances.map((u) => u.speaker))];
  const colorFor = makeColorFor(speakerOrder);
  const speakerColors = Object.fromEntries(speakerOrder.map((sp) => [sp, colorFor(sp)]));

  const actionRows: ActionRow[] = done
    ? (
        await db
          .select({
            id: actionItems.id,
            task: actionItems.task,
            ownerLabel: actionItems.ownerLabel,
            dueLabel: actionItems.dueLabel,
            assigneeId: actionItems.assigneeId,
            assigneeName: users.name,
            assigneeEmail: users.email,
            status: actionItems.status,
            sourceMs: actionItems.sourceMs,
          })
          .from(actionItems)
          .leftJoin(users, eq(users.id, actionItems.assigneeId))
          .where(eq(actionItems.recordingId, id))
          .orderBy(asc(actionItems.orderIdx))
      ).map((r) => ({
        id: r.id,
        task: r.task,
        ownerLabel: r.ownerLabel,
        dueLabel: r.dueLabel,
        assigneeId: r.assigneeId,
        assigneeName: r.assigneeId
          ? r.assigneeName ?? r.assigneeEmail?.split("@")[0] ?? "Teammate"
          : null,
        status: r.status,
        sourceMs: r.sourceMs,
      }))
    : [];

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
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                {done ? "Signal locked" : "Resolving"}
              </p>
              <h1 className="mt-2 max-w-5xl font-display text-[30px] font-normal leading-[1.03] tracking-[-0.01em] text-ink sm:text-[42px]">
                {rec.title ?? "Untitled recording"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[12px] text-faint">
                <span>{dateTimeLabel(rec.createdAt)}</span>
                {rec.durationSec ? <span>{fmtMs(rec.durationSec * 1000)}</span> : null}
                <span>{rec.source === "record" ? "Recorded" : "Uploaded"}</span>
                {language && (
                  <span className="inline-flex items-center gap-1 rounded-btn bg-accent-wash px-2 py-0.5 text-accent-deep">
                    <Translate size={12} weight="bold" /> {language}
                  </span>
                )}
                {!isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-btn bg-lock-wash px-2 py-0.5 text-lock">
                    <Globe size={12} weight="bold" /> Shared by {sharedBy}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-bg p-4 sm:p-5 lg:min-w-[25rem] lg:justify-end">
              {done && <ExportMenu recordingId={rec.id} />}
              {isOwner && done && (
                <VisibilityToggle recordingId={rec.id} initialPublic={rec.isPublic} />
              )}
              {isOwner && done && (
                <ShareLink recordingId={rec.id} initialToken={rec.shareToken} />
              )}
              {isOwner && <NoteActions id={rec.id} title={rec.title ?? "Untitled recording"} />}
            </div>
          </div>
        </div>

        {!done ? (
          <ProcessingView recordingId={rec.id} initialStatus={rec.status} />
        ) : (
          <NoteWorkspace
            recordingId={rec.id}
            durationSec={rec.durationSec}
            isOwner={isOwner}
            canEdit={isOwner}
            meId={session.user.id}
            utterances={utterances}
            speakerNames={tr?.speakerNames ?? {}}
            transcriptText={transcriptText}
            transcriptEdited={transcriptEdited}
            notesEditedBy={notesEditedBy}
            summary={res?.summary ?? null}
            actions={actionRows}
            decisions={res?.decisions ?? []}
            topics={res?.topics ?? []}
            followUps={res?.followUps ?? []}
            chapters={res?.chapters ?? []}
            speakerOrder={speakerOrder}
            speakerColors={speakerColors}
            history={history.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations as Citation[] | null,
            }))}
          />
        )}
      </main>
    </AppShell>
  );
}
