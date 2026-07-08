// Brand mark: a compact seismic trace glyph built from elements.
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
            background: i % 2 === 0 ? "var(--color-ink)" : "var(--color-mint)",
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

// The wordmark: editorial serif, natural case. The dot over the "i" is set in
// mint as a quiet nod to the intelligence layer.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SignalMark size={20} />
      <span className="font-display text-[21px] leading-none text-ink">
        Glacianav
      </span>
    </span>
  );
}
