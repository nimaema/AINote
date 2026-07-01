// Slow-drifting aurora mesh. Three large blurred gradient blobs on a fixed,
// pointer-events-none layer behind all content. Pure CSS (transform-only
// animation = GPU); reduced-motion freezes them via the global media rule.
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <span
        className="absolute h-[52vw] w-[52vw] rounded-full blur-[90px]"
        style={{
          top: "-14vw",
          left: "-8vw",
          background:
            "radial-gradient(circle at 30% 30%, var(--color-aurora-teal), transparent 66%)",
          opacity: 0.5,
          animation: "aurora-drift 26s var(--ease-in-out) infinite",
        }}
      />
      <span
        className="absolute h-[46vw] w-[46vw] rounded-full blur-[90px]"
        style={{
          top: "-6vw",
          right: "-10vw",
          background:
            "radial-gradient(circle at 60% 40%, var(--color-aurora-violet), transparent 64%)",
          opacity: 0.42,
          animation: "aurora-drift 32s var(--ease-in-out) infinite reverse",
        }}
      />
      <span
        className="absolute h-[50vw] w-[50vw] rounded-full blur-[100px]"
        style={{
          bottom: "-20vw",
          left: "22vw",
          background:
            "radial-gradient(circle at 50% 50%, var(--color-aurora-rose), transparent 66%)",
          opacity: 0.34,
          animation: "aurora-drift 38s var(--ease-in-out) infinite",
        }}
      />
      {/* Fine porcelain vignette to keep text zones calm */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(247,248,252,0.6) 100%)",
        }}
      />
    </div>
  );
}
