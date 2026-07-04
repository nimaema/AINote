"use client";

import { useRouter } from "next/navigation";
import { projectColor } from "@/lib/projects";

// The Atlas: projects plotted as charted territories on the ice field, with
// unmapped fog inviting the next capture. Clicking a territory travels to it.
export type Territory = {
  id: string;
  name: string;
  color: string;
  count: number;
};

// Hand-placed survey slots (viewBox 1000×300) — stable, no overlap for ≤8.
const SLOTS: [number, number][] = [
  [190, 150],
  [450, 205],
  [700, 120],
  [320, 80],
  [590, 60],
  [860, 210],
  [90, 245],
  [980, 70],
];

export function AtlasField({
  territories,
  unfiled,
}: {
  territories: Territory[];
  unfiled: number;
}) {
  const router = useRouter();
  const shown = territories.slice(0, 7);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-hairline bg-bg">
      <svg
        viewBox="0 0 1000 300"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Atlas of ${shown.length} territories`}
      >
        {/* Contours — the terrain itself */}
        <g fill="none" stroke="var(--color-lock)" strokeWidth="1" opacity="0.1">
          <path d="M-40 70 C 180 20, 380 120, 580 60 S 900 10, 1040 60" />
          <path d="M-40 120 C 190 70, 400 170, 600 110 S 910 60, 1040 110" />
          <path d="M-40 230 C 200 290, 420 190, 640 250 S 920 300, 1040 250" />
          <path d="M-40 280 C 210 340, 440 240, 660 300" />
        </g>

        {/* Territories */}
        {shown.map((t, i) => {
          const [cx, cy] = SLOTS[i % SLOTS.length];
          const r = Math.min(72, 34 + t.count * 7);
          const c = projectColor(t.color);
          return (
            <g
              key={t.id}
              onClick={() => router.push(`/project/${t.id}`)}
              className="cursor-pointer transition-opacity hover:opacity-80"
              role="link"
              aria-label={`Open ${t.name}`}
            >
              <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity="0.13" stroke={c} strokeWidth="1.5" />
              <circle
                cx={cx}
                cy={cy}
                r={Math.max(12, r - 11)}
                fill="none"
                stroke={c}
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity="0.5"
              />
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                className="font-mono"
                fontSize="13"
                fontWeight="700"
                fill="var(--color-ink)"
                style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {t.name.length > 14 ? `${t.name.slice(0, 13)}…` : t.name}
              </text>
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                className="font-mono"
                fontSize="10.5"
                fill="var(--color-muted)"
                style={{ letterSpacing: "0.12em" }}
              >
                {t.count} {t.count === 1 ? "SURVEY" : "SURVEYS"}
              </text>
            </g>
          );
        })}

        {/* Unfiled captures — plotted but unclaimed ground */}
        {unfiled > 0 && (
          <g opacity="0.75">
            <circle
              cx={SLOTS[shown.length % SLOTS.length][0]}
              cy={SLOTS[shown.length % SLOTS.length][1]}
              r={30}
              fill="none"
              stroke="var(--color-faint)"
              strokeWidth="1.2"
              strokeDasharray="4 5"
            />
            <text
              x={SLOTS[shown.length % SLOTS.length][0]}
              y={SLOTS[shown.length % SLOTS.length][1] + 4}
              textAnchor="middle"
              className="font-mono"
              fontSize="10.5"
              fill="var(--color-muted)"
              style={{ letterSpacing: "0.1em" }}
            >
              UNFILED · {unfiled}
            </text>
          </g>
        )}

        {/* The unmapped edge */}
        <text
          x="985"
          y="288"
          textAnchor="end"
          className="font-mono"
          fontSize="10.5"
          fill="var(--color-faint)"
          style={{ letterSpacing: "0.18em" }}
        >
          UNCHARTED →
        </text>
      </svg>

      {territories.length === 0 && unfiled === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="rounded-pill border border-hairline bg-panel-solid px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Unmapped territory — start a survey
          </p>
        </div>
      )}
    </div>
  );
}
