"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  FileText,
  ListChecks,
  CheckCircle,
  Flag,
  Hash,
  PencilLine,
  ListBullets,
} from "@phosphor-icons/react";
import type { Utterance, Citation, Chapter } from "@/db/schema";
import { QAPanel } from "@/components/note/qa-panel";
import { TranscriptPanel } from "@/components/note/transcript-panel";
import { CommentsPanel } from "@/components/note/comments-panel";
import { ActionBoard, type ActionRow } from "@/components/note/action-board";
import { EditableText, EditableList } from "@/components/note/editable";
import {
  NoteAudioContext,
  useNoteAudio,
  type FocusSignal,
  type NoteAudioValue,
} from "@/components/note/note-audio";
import { traceMatch } from "@/lib/trace";

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Workspace ────────────────────────────────────────────────────────

export function NoteWorkspace({
  recordingId,
  durationSec,
  isOwner,
  canEdit,
  transcriptEdited,
  notesEditedBy,
  meId,
  utterances,
  speakerNames,
  transcriptText,
  summary,
  actions,
  decisions,
  topics,
  followUps,
  chapters,
  speakerOrder,
  speakerColors,
  history,
}: {
  recordingId: string;
  durationSec: number | null;
  isOwner: boolean;
  canEdit: boolean;
  transcriptEdited: boolean;
  notesEditedBy: string | null;
  meId: string;
  utterances: Utterance[];
  speakerNames: Record<string, string>;
  transcriptText: string;
  summary: string | null;
  actions: ActionRow[];
  decisions: string[];
  topics: string[];
  followUps: string[];
  chapters: Chapter[];
  speakerOrder: string[];
  speakerColors: Record<string, string>;
  history: { id: string; role: "user" | "assistant"; content: string; citations?: Citation[] | null }[];
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState((durationSec ?? 0) * 1000);
  const [playing, setPlaying] = useState(false);
  const [focus, setFocus] = useState<FocusSignal | null>(null);
  const focusToken = useRef(0);

  const seekTo = useCallback((ms: number, play = true) => {
    const el = audioRef.current;
    focusToken.current += 1;
    setFocus({ ms, token: focusToken.current });
    if (el) {
      el.currentTime = ms / 1000;
      setCurrentMs(ms);
      if (play) {
        void el.play();
        setPlaying(true);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const ctxValue = useMemo<NoteAudioValue>(
    () => ({ seekTo, currentMs, durationMs, playing, toggle, focus }),
    [seekTo, currentMs, durationMs, playing, toggle, focus]
  );

  const saveResults = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch(`/api/recordings/${recordingId}/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    [recordingId]
  );

  // Trace anchors for the section chips + waveform markers. Action items carry
  // a precomputed sourceMs; decisions/follow-ups are matched on the client.
  const decisionTraces = useMemo(
    () => decisions.map((d) => traceMatch(d, utterances)),
    [decisions, utterances]
  );
  const followTraces = useMemo(
    () => followUps.map((f) => traceMatch(f, utterances)),
    [followUps, utterances]
  );

  const markers = useMemo(
    () =>
      [...actions.map((a) => a.sourceMs), ...decisionTraces]
        .filter((m): m is number => m != null)
        .sort((a, b) => a - b),
    [actions, decisionTraces]
  );

  const noteStats = [
    { label: "Actions", value: String(actions.length) },
    { label: "Decisions", value: String(decisions.length) },
    { label: "Follow-ups", value: String(followUps.length) },
    { label: "Speakers", value: String(speakerOrder.length || 1) },
  ];

  return (
    <NoteAudioContext.Provider value={ctxValue}>
      <audio
        ref={audioRef}
        src={`/api/recordings/${recordingId}/audio`}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDurationMs(d * 1000);
        }}
        onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
        onEnded={() => {
          setPlaying(false);
          setCurrentMs(0);
        }}
        className="hidden"
      />

      <div className="resolve-in flex flex-col gap-5">
        <Scrubber
          utterances={utterances}
          speakerColors={speakerColors}
          markers={markers}
          chapterMarks={chapters.map((c) => c.startMs)}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="flex flex-col gap-5">
            <section className="rounded-[18px] border border-hairline bg-panel-solid">
              <div className="grid gap-px bg-hairline sm:grid-cols-4">
                {noteStats.map((item) => (
                  <div key={item.label} className="bg-panel-solid px-4 py-3">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                      {item.label}
                    </p>
                    <p className="tabular mt-1 text-[22px] font-semibold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {chapters.length > 0 && (
              <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
                <PanelHeading icon={<ListBullets size={16} weight="duotone" />}>Chapters</PanelHeading>
                <ol className="mt-3 flex flex-col">
                  {chapters.map((c, i) => (
                    <li key={i}>
                      <button
                        onClick={() => seekTo(c.startMs)}
                        className="group flex w-full items-start gap-3 rounded-[12px] px-2 py-2.5 text-left transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-bg cursor-pointer"
                      >
                        <span className="mt-0.5 shrink-0 rounded-pill bg-accent-wash px-2 py-0.5 font-mono text-[11px] tabular text-accent-deep">
                          {fmtMs(c.startMs)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-ink group-hover:text-accent-deep">{c.title}</span>
                          {c.summary && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{c.summary}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(summary || canEdit) && (
              <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <PanelHeading icon={<FileText size={17} weight="duotone" />}>Note brief</PanelHeading>
                  {notesEditedBy && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                      <PencilLine size={11} /> Edited by {notesEditedBy}
                    </span>
                  )}
                </div>
                <div className="mt-3 max-w-4xl">
                  <EditableText
                    value={summary ?? ""}
                    canEdit={canEdit}
                    onSave={(v) => saveResults({ summary: v })}
                    className="font-display text-[19px] leading-[1.5] text-ink-soft"
                  />
                </div>
              </section>
            )}

            {actions.length > 0 && (
              <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
                <PanelHeading icon={<ListChecks size={16} weight="duotone" />}>Action board</PanelHeading>
                <div className="mt-4">
                  <ActionBoard actions={actions} canManage={isOwner} />
                </div>
              </section>
            )}

            {(decisions.length > 0 || topics.length > 0 || followUps.length > 0 || canEdit) && (
              <section className="rounded-[18px] border border-hairline bg-panel-solid p-5 sm:p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  {(decisions.length > 0 || canEdit) && (
                    <div>
                      <PanelHeading icon={<CheckCircle size={16} weight="duotone" />}>Decisions</PanelHeading>
                      <div className="mt-3">
                        <EditableList
                          items={decisions}
                          canEdit={canEdit}
                          tone="lock"
                          traces={decisionTraces}
                          onSeek={seekTo}
                          onSave={(next) => saveResults({ decisions: next })}
                          addLabel="Add decision"
                        />
                      </div>
                    </div>
                  )}
                  {(followUps.length > 0 || canEdit) && (
                    <div>
                      <PanelHeading icon={<Flag size={16} weight="duotone" />}>Follow-ups</PanelHeading>
                      <div className="mt-3">
                        <EditableList
                          items={followUps}
                          canEdit={canEdit}
                          tone="warn"
                          traces={followTraces}
                          onSeek={seekTo}
                          onSave={(next) => saveResults({ followUps: next })}
                          addLabel="Add follow-up"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {(topics.length > 0 || canEdit) && (
                  <div className="mt-5 border-t border-hairline pt-5">
                    <PanelHeading icon={<Hash size={16} weight="duotone" />}>Topics</PanelHeading>
                    <div className="mt-3">
                      <EditableList
                        items={topics}
                        canEdit={canEdit}
                        variant="chips"
                        onSave={(next) => saveResults({ topics: next })}
                        addLabel="Add topic"
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            <TranscriptPanel
              recordingId={recordingId}
              isOwner={isOwner}
              canEdit={canEdit}
              transcriptEdited={transcriptEdited}
              utterances={utterances}
              transcriptText={transcriptText}
              speakerNames={speakerNames}
              speakerOrder={speakerOrder}
              speakerColors={speakerColors}
            />

            <CommentsPanel recordingId={recordingId} meId={meId} />
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start">
            <QAPanel
              endpoint={`/api/recordings/${recordingId}/qa`}
              onSeek={seekTo}
              initialMessages={history.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                citations: m.citations as Citation[] | null,
              }))}
            />
          </div>
        </div>
      </div>
    </NoteAudioContext.Provider>
  );
}

// ─── Waveform scrubber (navigation, not decoration) ───────────────────

const SCRUB_BARS = 84;

function Scrubber({
  utterances,
  speakerColors,
  markers,
  chapterMarks,
}: {
  utterances: Utterance[];
  speakerColors: Record<string, string>;
  markers: number[];
  chapterMarks: number[];
}) {
  const { seekTo, currentMs, durationMs, playing, toggle } = useNoteAudio();
  const trackRef = useRef<HTMLDivElement>(null);

  const bars = useMemo(() => {
    return Array.from({ length: SCRUB_BARS }, (_, i) => {
      const a = Math.sin(i * 0.5) * 0.5 + 0.5;
      const b = Math.sin(i * 0.21 + 1.1) * 0.5 + 0.5;
      const env = Math.sin((i / SCRUB_BARS) * Math.PI);
      const h = (0.22 + Math.max(a * 0.7, b) * 0.78 * (0.5 + env * 0.7)) * 100;
      const frac = i / SCRUB_BARS;
      const ms = frac * durationMs;
      const u = utterances.find((x) => ms >= x.start && ms < x.end);
      const color = u ? speakerColors[u.speaker] : "var(--color-hairline-strong)";
      return { h: h.toFixed(2), color };
    });
  }, [durationMs, utterances, speakerColors]);

  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;

  function seekAt(clientX: number) {
    const track = trackRef.current;
    if (!track || !durationMs) return;
    const rect = track.getBoundingClientRect();
    const frac = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    seekTo(frac * durationMs);
  }

  return (
    <div className="glass flex items-center gap-4 rounded-panel p-4 sm:p-5">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_24px_-14px_rgba(214,70,31,0.7)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
      >
        {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
      </button>

      <div
        ref={trackRef}
        onClick={(e) => seekAt(e.clientX)}
        className="relative h-14 flex-1 cursor-pointer"
        role="slider"
        aria-label="Seek recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1000)}
        aria-valuenow={Math.round(currentMs / 1000)}
        tabIndex={0}
      >
        {/* Chapter starts (vermilion) + source-trace markers (pine). */}
        {durationMs > 0 &&
          chapterMarks.map((m, i) => (
            <span
              key={`ch${i}`}
              aria-hidden
              className="absolute top-0 h-3.5 w-[1.5px] -translate-x-1/2 rounded-full bg-accent"
              style={{ left: `${(m / durationMs) * 100}%` }}
            />
          ))}
        {durationMs > 0 &&
          markers.map((m, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-0 h-2 w-px -translate-x-1/2 bg-lock/70"
              style={{ left: `${(m / durationMs) * 100}%` }}
            />
          ))}

        <div className="flex h-full w-full items-end gap-[2px] pt-3">
          {bars.map((bar, i) => {
            const played = i / SCRUB_BARS <= progress;
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-opacity"
                style={{
                  height: `${bar.h}%`,
                  background: bar.color,
                  opacity: played ? 1 : 0.28,
                }}
              />
            );
          })}
        </div>

        {/* Playhead */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-3 w-px bg-ink"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <span className="tabular shrink-0 font-mono text-[12px] text-muted">
        {fmtMs(currentMs)} / {fmtMs(durationMs)}
      </span>
    </div>
  );
}

// ─── Small parts ──────────────────────────────────────────────────────

function PanelHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-accent-deep">
      {icon}
      <h2 className="text-[13.5px] font-semibold text-ink">{children}</h2>
    </div>
  );
}

