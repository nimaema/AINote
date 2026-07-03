"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, SlidersHorizontal, TextAlignLeft, Play } from "@phosphor-icons/react";
import type { Utterance } from "@/db/schema";
import { SpeakerEditor } from "@/components/note/speaker-editor";
import { useNoteAudio } from "@/components/note/note-audio";

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function TranscriptPanel({
  recordingId,
  isOwner,
  utterances,
  transcriptText,
  speakerNames,
  speakerOrder,
  speakerColors,
}: {
  recordingId: string;
  isOwner: boolean;
  utterances: Utterance[];
  transcriptText: string;
  speakerNames: Record<string, string>;
  speakerOrder: string[];
  speakerColors: Record<string, string>;
}) {
  const { currentMs, focus, seekTo } = useNoteAudio();
  const [query, setQuery] = useState("");
  const [speaker, setSpeaker] = useState<string>("all");
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [pendingMs, setPendingMs] = useState<number | null>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement | null>());

  const displayName = (raw: string) => speakerNames[raw] ?? raw;
  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const list: { u: Utterance; i: number }[] = [];
    utterances.forEach((u, i) => {
      const speakerMatch = speaker === "all" || u.speaker === speaker;
      const textMatch =
        !normalized ||
        u.text.toLowerCase().includes(normalized) ||
        displayName(u.speaker).toLowerCase().includes(normalized);
      if (speakerMatch && textMatch) list.push({ u, i });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, speaker, utterances, speakerNames]);

  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < utterances.length; i++) {
      const u = utterances[i];
      if (currentMs >= u.start && currentMs < u.end) return i;
    }
    return idx;
  }, [currentMs, utterances]);

  // A trace was requested: clear filters so the target is present, then scroll.
  useEffect(() => {
    if (!focus) return;
    setQuery("");
    setSpeaker("all");
    setPendingMs(focus.ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.token]);

  useEffect(() => {
    if (pendingMs == null) return;
    let target = -1;
    for (let i = 0; i < utterances.length; i++) {
      if (utterances[i].start <= pendingMs + 1) target = i;
    }
    if (target < 0) {
      setPendingMs(null);
      return;
    }
    const el = itemRefs.current.get(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashIndex(target);
      const t = setTimeout(() => setFlashIndex(null), 1600);
      setPendingMs(null);
      return () => clearTimeout(t);
    }
  }, [pendingMs, filtered, utterances]);

  const hasUtterances = utterances.length > 0;

  return (
    <section className="rounded-[18px] border border-hairline bg-panel-solid">
      <div className="border-b border-hairline p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-accent-deep">
            <TextAlignLeft size={17} weight="duotone" />
            <h2 className="text-[14px] font-semibold text-ink">Transcript</h2>
            {hasUtterances && (
              <span className="rounded-[7px] bg-bg px-2 py-0.5 font-mono text-[10.5px] text-faint">
                {filtered.length}/{utterances.length}
              </span>
            )}
          </div>
          {isOwner && speakerOrder.length > 0 && (
            <SpeakerEditor
              recordingId={recordingId}
              speakers={speakerOrder}
              initialNames={speakerNames}
              colors={speakerColors}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search transcript</span>
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcript"
              className="h-10 w-full rounded-[12px] border border-hairline bg-bg pl-9 pr-3 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
            />
          </label>
          {hasUtterances && (
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-[12px] border border-hairline bg-bg p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SlidersHorizontal size={14} className="ml-2 shrink-0 text-faint" />
              <button
                onClick={() => setSpeaker("all")}
                className={`h-7 shrink-0 rounded-[8px] px-2.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                  speaker === "all" ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                }`}
              >
                All
              </button>
              {speakerOrder.map((raw) => (
                <button
                  key={raw}
                  onClick={() => setSpeaker(raw)}
                  className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                    speaker === raw ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: speakerColors[raw] }}
                    aria-hidden
                  />
                  {displayName(raw)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasUtterances ? (
        filtered.length > 0 ? (
          <div className="max-h-[620px] overflow-y-auto p-3 sm:p-4">
            <div className="flex flex-col gap-1.5">
              {filtered.map(({ u, i }) => {
                const color = speakerColors[u.speaker];
                const active = i === activeIndex;
                const flash = i === flashIndex;
                return (
                  <button
                    key={`${u.start}-${i}`}
                    ref={(el) => {
                      itemRefs.current.set(i, el);
                    }}
                    onClick={() => seekTo(u.start)}
                    className={`group grid gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-150 [transition-timing-function:var(--ease-out)] md:grid-cols-[8rem_minmax(0,1fr)] cursor-pointer ${
                      flash
                        ? "border-lock/50 bg-lock-wash"
                        : active
                          ? "border-accent/40 bg-accent-wash"
                          : "border-transparent hover:border-hairline hover:bg-bg"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2 md:block">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="truncate text-[12.5px] font-semibold text-ink">
                          {displayName(u.speaker)}
                        </span>
                      </div>
                      <span
                        className={`tabular inline-flex items-center gap-1 font-mono text-[11px] md:mt-1 ${
                          active ? "text-accent-deep" : "text-faint group-hover:text-accent-deep"
                        }`}
                      >
                        <Play
                          size={9}
                          weight="fill"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        />
                        {fmtMs(u.start)}
                      </span>
                    </div>
                    <p className="text-[14.5px] leading-relaxed text-ink-soft">{u.text}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center px-6 py-10 text-center">
            <div className="max-w-sm">
              <p className="text-[14px] font-semibold text-ink">No transcript matches</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                Clear the search or switch speakers to return to the full transcript.
              </p>
            </div>
          </div>
        )
      ) : (
        <p className="whitespace-pre-wrap p-5 text-[14.5px] leading-relaxed text-ink-soft">
          {transcriptText}
        </p>
      )}
    </section>
  );
}
