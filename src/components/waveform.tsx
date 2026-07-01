"use client";

import { useMemo } from "react";

// A spectral waveform of mirrored bars. `live` makes the bars breathe (staggered
// scaleY on the GPU); otherwise it renders a static, varied silhouette. This is
// the app's signature object — it appears idle here and, later, wired to real
// microphone amplitude during recording and to playback in the note view.
export function Waveform({
  bars = 56,
  live = true,
  height = 72,
  className = "",
}: {
  bars?: number;
  live?: boolean;
  height?: number;
  className?: string;
}) {
  // Deterministic spectral-looking heights (no Math.random — stable on SSR).
  // Fixed precision so the server and client emit byte-identical style strings.
  const heights = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const a = Math.sin(i * 0.55) * 0.5 + 0.5;
        const b = Math.sin(i * 0.17 + 1.3) * 0.5 + 0.5;
        const env = Math.sin((i / bars) * Math.PI); // taper the ends
        const raw = 0.18 + Math.max(a * 0.7, b) * 0.82 * (0.55 + env * 0.65);
        return (Math.min(raw, 1) * 100).toFixed(2);
      }),
    [bars]
  );

  return (
    <div
      aria-hidden
      className={`flex items-center gap-[3px] ${className}`}
      style={{ height }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h}%`,
            background:
              "linear-gradient(180deg, var(--color-accent), var(--color-aurora-violet))",
            transformOrigin: "center",
            opacity: 0.9,
            animation: live
              ? `wave ${900 + (i % 7) * 120}ms ${i * 28}ms var(--ease-in-out) infinite alternate`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
