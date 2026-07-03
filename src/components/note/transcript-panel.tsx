"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, SlidersHorizontal, TextAlignLeft } from "@phosphor-icons/react";
import type { Utterance } from "@/db/schema";
import { SpeakerEditor } from "@/components/note/speaker-editor";

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
  const [query, setQuery] = useState("");
  const [speaker, setSpeaker] = useState<string>("all");

  const displayName = (raw: string) => speakerNames[raw] ?? raw;
  const normalized = query.trim().toLowerCase();

  const filteredUtterances = useMemo(() => {
    return utterances.filter((utterance) => {
      const speakerMatch = speaker === "all" || utterance.speaker === speaker;
      const textMatch =
        !normalized ||
        utterance.text.toLowerCase().includes(normalized) ||
        displayName(utterance.speaker).toLowerCase().includes(normalized);
      return speakerMatch && textMatch;
    });
  }, [normalized, speaker, utterances, speakerNames]);

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
                {filteredUtterances.length}/{utterances.length}
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
        filteredUtterances.length > 0 ? (
          <div className="max-h-[620px] overflow-y-auto p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              {filteredUtterances.map((utterance, index) => {
                const color = speakerColors[utterance.speaker];
                return (
                  <div
                    key={`${utterance.start}-${index}`}
                    className="grid gap-2 rounded-[14px] border border-transparent px-3 py-2.5 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline hover:bg-bg md:grid-cols-[8rem_minmax(0,1fr)]"
                  >
                    <div className="flex min-w-0 items-center gap-2 md:block">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="truncate text-[12.5px] font-semibold text-ink">
                          {displayName(utterance.speaker)}
                        </span>
                      </div>
                      <span className="tabular font-mono text-[11px] text-faint md:mt-1 md:block">
                        {fmtMs(utterance.start)}
                      </span>
                    </div>
                    <p className="text-[14.5px] leading-relaxed text-ink-soft">{utterance.text}</p>
                  </div>
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
