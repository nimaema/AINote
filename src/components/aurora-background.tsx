// Console background used on unauthenticated screens. It is intentionally flat:
// no decorative blobs, just recorder-panel texture and one signal wash.
export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 320px at 70% -10%, rgba(240,182,74,0.12), transparent 62%), linear-gradient(180deg, #171912 0%, var(--color-bg) 48%)",
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(rgba(244,237,221,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(244,237,221,0.025) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(16,17,15,0.72) 100%)",
        }}
      />
    </div>
  );
}
