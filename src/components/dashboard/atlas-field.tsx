"use client";

import { useRouter } from "next/navigation";
import { projectColor } from "@/lib/projects";

// The Insight Hub: projects arranged as concentric architectural frames drawn
// inward toward a central "Insight Hub". Each project sits on a frame edge with
// its own colored marker; clicking one travels to that project.
export type Territory = {
  id: string;
  name: string;
  color: string;
  count: number;
};

// Hand-placed anchor points around the nested frames (viewBox 640×300).
// Each: [x, y, textAnchor]. Ordered so the first few read cleanly.
const ANCHORS: [number, number, "start" | "middle" | "end"][] = [
  [96, 58, "start"],
  [544, 150, "end"],
  [110, 248, "start"],
  [512, 58, "end"],
  [96, 150, "start"],
  [536, 248, "end"],
];

export function AtlasField({
  territories,
  unfiled,
}: {
  territories: Territory[];
  unfiled: number;
}) {
  const router = useRouter();
  const shown = territories.slice(0, 6);

  // Concentric frames — as many as we can justify, min 3 for the architecture.
  const frameCount = Math.max(3, Math.min(4, shown.length));
  const frames = Array.from({ length: frameCount }, (_, i) => {
    const inset = i * 34;
    return {
      x: 60 + inset,
      y: 30 + inset,
      w: 520 - inset * 2,
      h: 240 - inset * 2,
      opacity: 0.5 - i * 0.1,
    };
  });

  return (
    <div className="relative overflow-hidden rounded-card border border-hairline bg-bg">
      <svg
        viewBox="0 0 640 300"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Insight hub of ${shown.length} projects`}
      >
        {/* Faint architect's grid */}
        <g stroke="var(--color-hairline)" strokeWidth="1" opacity="0.7">
          {[110, 220, 330, 440, 530].map((x) => (
            <line key={`v${x}`} x1={x} y1="20" x2={x} y2="280" />
          ))}
          {[80, 150, 220].map((y) => (
            <line key={`h${y}`} x1="40" y1={y} x2="600" y2={y} />
          ))}
        </g>

        {/* Concentric frames drawing inward */}
        {frames.map((f, i) => (
          <rect
            key={i}
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            rx="10"
            fill="none"
            stroke="var(--color-mint)"
            strokeWidth="1.5"
            opacity={f.opacity}
          />
        ))}

        {/* Central label */}
        <g>
          <rect
            x="248"
            y="126"
            width="144"
            height="48"
            rx="8"
            fill="var(--color-panel-solid)"
            stroke="var(--color-hairline-strong)"
            strokeWidth="1"
          />
          <text
            x="320"
            y="156"
            textAnchor="middle"
            className="font-display"
            fontSize="19"
            fill="var(--color-ink)"
          >
            Insight Hub
          </text>
        </g>

        {/* Projects on the frame edges */}
        {shown.map((t, i) => {
          const [x, y, anchor] = ANCHORS[i % ANCHORS.length];
          const c = projectColor(t.color);
          const dotX = anchor === "end" ? x + 12 : x - 12;
          const label = t.name.length > 18 ? `${t.name.slice(0, 17)}…` : t.name;
          return (
            <g
              key={t.id}
              onClick={() => router.push(`/project/${t.id}`)}
              className="cursor-pointer transition-opacity hover:opacity-70"
              role="link"
              aria-label={`Open ${t.name}`}
            >
              <circle cx={dotX} cy={y - 4} r="4" fill={c} />
              <text
                x={x}
                y={y}
                textAnchor={anchor}
                fontSize="12.5"
                fontWeight="600"
                fill="var(--color-ink)"
                fontFamily="var(--font-hanken)"
              >
                {label}
              </text>
              <text
                x={x}
                y={y + 15}
                textAnchor={anchor}
                className="font-mono"
                fontSize="10"
                fill="var(--color-faint)"
                style={{ letterSpacing: "0.08em" }}
              >
                {t.count} {t.count === 1 ? "note" : "notes"}
              </text>
            </g>
          );
        })}

        {/* Unfiled — an unplaced marker */}
        {unfiled > 0 && (
          <g opacity="0.85">
            <circle cx="596" cy="40" r="4" fill="none" stroke="var(--color-faint)" strokeWidth="1.2" strokeDasharray="2 3" />
            <text
              x="586"
              y="44"
              textAnchor="end"
              className="font-mono"
              fontSize="10"
              fill="var(--color-faint)"
              style={{ letterSpacing: "0.08em" }}
            >
              Unfiled · {unfiled}
            </text>
          </g>
        )}
      </svg>

      {territories.length === 0 && unfiled === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="rounded-pill border border-hairline bg-panel-solid px-4 py-2 text-[12px] text-muted">
            No projects yet — record a note to begin
          </p>
        </div>
      )}
    </div>
  );
}
