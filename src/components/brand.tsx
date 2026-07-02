// Brand mark: a compact spectral waveform glyph built from elements.
// `live` breathes the bars for recording and sign-in surfaces.
export function SignalMark({
  size = 22,
  live = false,
  className = "",
}: {
  size?: number;
  live?: boolean;
  className?: string;
}) {
  const bars = [0.4, 0.75, 1, 0.55, 0.85, 0.35];
  return (
    <span
      aria-hidden
      className={`inline-flex items-center gap-[2px] ${className}`}
      style={{ height: size }}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{
            height: `${h * 100}%`,
            background:
              "linear-gradient(180deg, var(--color-accent-deep), var(--color-accent))",
            transformOrigin: "center",
            animation: live
              ? `wave ${820 + i * 90}ms ${i * 70}ms var(--ease-in-out) infinite alternate`
              : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SignalMark size={20} />
      <span className="font-display text-[16px] font-bold tracking-tight text-ink">
        GlaciaNav
        <span className="font-mono text-[13px] font-normal text-faint">
          {" "}
          / notes
        </span>
      </span>
    </span>
  );
}
