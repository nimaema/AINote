// Field background for unauthenticated screens: the ice field with faint
// topographic contour lines — the map before anything is charted.
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px 420px at 78% -14%, rgba(10,125,149,0.09), transparent 60%), var(--color-bg)",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#0a7d95" strokeWidth="1" opacity="0.09">
          <path d="M-60 180 C 240 100, 480 260, 760 170 S 1240 60, 1520 140" />
          <path d="M-60 240 C 240 160, 500 320, 780 230 S 1240 120, 1520 200" />
          <path d="M-60 300 C 250 230, 520 380, 800 290 S 1250 190, 1520 260" />
          <path d="M-80 640 C 200 730, 520 560, 820 680 S 1240 780, 1520 700" />
          <path d="M-80 710 C 210 800, 540 630, 840 750 S 1250 850, 1520 770" />
        </g>
      </svg>
    </div>
  );
}
