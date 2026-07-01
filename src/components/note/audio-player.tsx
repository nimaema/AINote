"use client";

import { useMemo, useRef, useState } from "react";
import { Play, Pause } from "@phosphor-icons/react";

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Waveform scrubber: two stacked bar layers (muted + accent). The accent layer
// is revealed left-to-right with clip-path as playback progresses — one style
// update per frame, no per-bar re-render. Click anywhere to seek.
export function AudioPlayer({
  recordingId,
  durationSec,
}: {
  recordingId: string;
  durationSec?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);

  const BARS = 72;
  const heights = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => {
        const a = Math.sin(i * 0.5) * 0.5 + 0.5;
        const b = Math.sin(i * 0.21 + 1.1) * 0.5 + 0.5;
        const env = Math.sin((i / BARS) * Math.PI);
        return (
          (0.2 + Math.max(a * 0.7, b) * 0.8 * (0.5 + env * 0.7)) *
          100
        ).toFixed(2);
      }),
    []
  );

  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function seek(e: React.MouseEvent) {
    const el = audioRef.current;
    const bars = barsRef.current;
    if (!el || !bars || !duration) return;
    const rect = bars.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    el.currentTime = frac * duration;
    setCurrent(el.currentTime);
  }

  const Bars = ({ accent }: { accent?: boolean }) => (
    <div className="flex h-full w-full items-center gap-[2px]">
      {heights.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h}%`,
            background: accent
              ? "linear-gradient(180deg, var(--color-accent), var(--color-aurora-violet))"
              : "var(--color-hairline-strong)",
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="glass flex items-center gap-4 rounded-panel p-4 sm:p-5">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white shadow-[0_8px_22px_-8px_rgba(14,165,233,0.6)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
      >
        {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
      </button>

      <div
        ref={barsRef}
        onClick={seek}
        className="relative h-12 flex-1 cursor-pointer"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
      >
        <Bars />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
        >
          <Bars accent />
        </div>
      </div>

      <span className="tabular shrink-0 font-mono text-[12px] text-muted">
        {fmt(current)} / {fmt(duration)}
      </span>

      <audio
        ref={audioRef}
        src={`/api/recordings/${recordingId}/audio`}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        className="hidden"
      />
    </div>
  );
}
