"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        <Scrubber markers={markers} chapterMarks={chapters.map((c) => c.startMs)} />

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
                    className="text-[16px] leading-[1.6] text-ink-soft"
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
                    <PanelHeading icon={<Hash size={16} weight="duotone" />}>Tags</PanelHeading>
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

// ─── The Route (navigation, not decoration) ───────────────────────────
// The recording rendered as a drawn path: playback inks the route in glacial
// cyan, chapters are waypoints, action anchors are flags. Click anywhere on
// the route to travel to that moment. The path's x is monotonic, so time maps
// linearly to arc length and clicks map back by nearest sampled x.

const ROUTE_D =
  "M12 84 C 120 22, 235 112, 360 62 C 470 18, 590 24, 700 72 C 800 112, 900 38, 988 56";
const ROUTE_SAMPLES = 240;

function Scrubber({ markers, chapterMarks }: { markers: number[]; chapterMarks: number[] }) {
  const { seekTo, currentMs, durationMs, playing, toggle } = useNoteAudio();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [geom, setGeom] = useState<{ len: number; pts: { x: number; y: number }[] } | null>(null);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const pts = Array.from({ length: ROUTE_SAMPLES + 1 }, (_, i) => {
      const pt = p.getPointAtLength((len * i) / ROUTE_SAMPLES);
      return { x: pt.x, y: pt.y };
    });
    setGeom({ len, pts });
  }, []);

  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;
  const at = (frac: number) =>
    geom?.pts[Math.max(0, Math.min(ROUTE_SAMPLES, Math.round(frac * ROUTE_SAMPLES)))];
  const head = at(progress);

  function seekAt(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !durationMs || !geom) return;
    const rect = svg.getBoundingClientRect();
    const xView = ((clientX - rect.left) / rect.width) * 1000;
    // Nearest sample by x (path is monotonic in x).
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= ROUTE_SAMPLES; i++) {
      const d = Math.abs(geom.pts[i].x - xView);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    seekTo((best / ROUTE_SAMPLES) * durationMs);
  }

  return (
    <div
      className="flex items-center gap-4 rounded-panel border p-4 sm:p-5"
      style={{
        background: "linear-gradient(180deg, rgba(118,215,182,0.30), rgba(199,238,222,0.50))",
        borderColor: "rgba(118,215,182,0.65)",
      }}
    >
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-bg transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
      >
        {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
      </button>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 120"
        onClick={(e) => seekAt(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seekTo(Math.min(durationMs, currentMs + 5000));
          if (e.key === "ArrowLeft") seekTo(Math.max(0, currentMs - 5000));
        }}
        className="h-auto min-w-0 flex-1 cursor-pointer"
        role="slider"
        aria-label="Travel the route"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1000)}
        aria-valuenow={Math.round(currentMs / 1000)}
        tabIndex={0}
      >
        {/* Base line — the unplayed waveform trace */}
        <path
          ref={pathRef}
          d={ROUTE_D}
          fill="none"
          stroke="rgba(5,81,62,0.24)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Progress — the route inked in as you travel */}
        {geom && (
          <path
            d={ROUTE_D}
            fill="none"
            stroke="var(--color-accent-deep)"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={geom.len}
            strokeDashoffset={geom.len * (1 - progress)}
            style={{ transition: "stroke-dashoffset 120ms linear" }}
          />
        )}
        {/* Waypoints — chapter starts */}
        {geom &&
          durationMs > 0 &&
          chapterMarks.map((m, i) => {
            const pt = at(m / durationMs);
            if (!pt) return null;
            return (
              <circle
                key={`wp${i}`}
                cx={pt.x}
                cy={pt.y}
                r={7}
                fill="var(--color-lock)"
                stroke="var(--color-panel-solid)"
                strokeWidth={2.5}
              />
            );
          })}
        {/* Flags — where the notes came from */}
        {geom &&
          durationMs > 0 &&
          markers.map((m, i) => {
            const pt = at(m / durationMs);
            if (!pt) return null;
            return (
              <g key={`fl${i}`} aria-hidden>
                <line
                  x1={pt.x}
                  y1={pt.y}
                  x2={pt.x}
                  y2={pt.y - 26}
                  stroke="var(--color-ink)"
                  strokeWidth={1.5}
                />
                <polygon
                  points={`${pt.x},${pt.y - 26} ${pt.x + 15},${pt.y - 21.5} ${pt.x},${pt.y - 17}`}
                  fill="var(--color-accent)"
                />
                <circle cx={pt.x} cy={pt.y} r={4} fill="var(--color-accent)" />
              </g>
            );
          })}
        {/* Playhead — you are here */}
        {geom && head && (
          <circle
            cx={head.x}
            cy={head.y}
            r={8}
            fill="var(--color-ink)"
            stroke="#fff"
            strokeWidth={2.5}
          />
        )}
      </svg>

      <span className="tabular shrink-0 font-mono text-[12px] text-ink-soft">
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

