// Field background for unauthenticated screens. Warm paper, one vermilion
// signal wash at the top edge, and a faint measurement grid — the instrument
// at rest, in daylight. No decorative blobs.
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(1000px 400px at 78% -12%, rgba(214,70,31,0.10), transparent 60%), var(--color-bg)",
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(rgba(34,29,21,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(34,29,21,0.038) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(120% 90% at 50% 0%, black, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 50% 0%, black, transparent 78%)",
        }}
      />
    </div>
  );
}
