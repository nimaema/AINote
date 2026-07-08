"use client";

import { useRouter } from "next/navigation";
import { projectColor } from "@/lib/projects";

// The Insight Hub: topics as a constellation around a central workspace node.
// Each topic is sized by how many notes it holds, connected back to the hub,
// and labelled with its note and action counts. Clicking a node opens it.
export type Territory = {
  id: string;
  name: string;
  color: string;
  count: number;
  actionCount?: number;
};

const CX = 380;
const CY = 168;
const RX = 250; // ellipse radii for node placement
const RY = 116;

function nodeRadius(count: number) {
  return 15 + Math.min(count, 14) * 1.6; // 15–37px
}

export function AtlasField({
  territories,
  unfiled,
}: {
  territories: Territory[];
  unfiled: number;
}) {
  const router = useRouter();
  const shown = territories.slice(0, 7);
  const total = territories.reduce((sum, t) => sum + t.count, 0);

  // Place nodes evenly around the ellipse, starting at the top.
  const nodes = shown.map((t, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, shown.length);
    const x = CX + RX * Math.cos(angle);
    const y = CY + RY * Math.sin(angle);
    const anchorEnd = x < CX - 8;
    return { t, x, y, r: nodeRadius(t.count), anchorEnd };
  });

  return (
    <div className="relative overflow-hidden rounded-card border border-hairline bg-bg">
      <svg
        viewBox="0 0 760 336"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Insight hub of ${shown.length} topics`}
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-mint)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-mint)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft mint halo behind the hub */}
        <circle cx={CX} cy={CY} r={92} fill="url(#hubGlow)" />

        {/* Connectors from hub to each node — drawn in on load */}
        {nodes.map(({ t, x, y }, i) => {
          const len = Math.hypot(x - CX, y - CY);
          return (
            <line
              key={`c${t.id}`}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={projectColor(t.color)}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray={len}
              strokeDashoffset={len}
              className="route-draw"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          );
        })}

        {/* Central hub */}
        <circle cx={CX} cy={CY} r={40} fill="var(--color-panel-solid)" stroke="var(--color-hairline-strong)" strokeWidth={1.5} />
        <text x={CX} y={CY - 3} textAnchor="middle" className="tabular" fontSize="22" fontWeight="600" fill="var(--color-ink)" fontFamily="var(--font-hanken)">
          {total}
        </text>
        <text x={CX} y={CY + 15} textAnchor="middle" fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)" style={{ letterSpacing: "0.08em" }}>
          notes
        </text>

        {/* Topic nodes */}
        {nodes.map(({ t, x, y, r, anchorEnd }) => {
          const c = projectColor(t.color);
          const label = t.name.length > 16 ? `${t.name.slice(0, 15)}…` : t.name;
          const lx = anchorEnd ? x - r - 8 : x + r + 8;
          return (
            <g
              key={t.id}
              onClick={() => router.push(`/project/${t.id}`)}
              className="cursor-pointer transition-opacity hover:opacity-80"
              role="link"
              aria-label={`Open ${t.name}`}
            >
              <circle cx={x} cy={y} r={r} fill={c} fillOpacity={0.14} stroke={c} strokeWidth={2} />
              <text x={x} y={y + 4} textAnchor="middle" className="tabular" fontSize="13" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-hanken)">
                {t.count}
              </text>
              <text
                x={lx}
                y={y - 1}
                textAnchor={anchorEnd ? "end" : "start"}
                fontSize="12.5"
                fontWeight="600"
                fill="var(--color-ink)"
                fontFamily="var(--font-hanken)"
              >
                {label}
              </text>
              <text
                x={lx}
                y={y + 13}
                textAnchor={anchorEnd ? "end" : "start"}
                className="font-mono"
                fontSize="10"
                fill="var(--color-faint)"
                style={{ letterSpacing: "0.04em" }}
              >
                {t.count} {t.count === 1 ? "note" : "notes"}
                {t.actionCount ? ` · ${t.actionCount} action${t.actionCount === 1 ? "" : "s"}` : ""}
              </text>
            </g>
          );
        })}

        {/* Unfiled marker */}
        {unfiled > 0 && (
          <g opacity={0.9}>
            <circle cx={40} cy={30} r={5} fill="none" stroke="var(--color-faint)" strokeWidth={1.4} strokeDasharray="2 3" />
            <text x={52} y={34} className="font-mono" fontSize="10.5" fill="var(--color-faint)" style={{ letterSpacing: "0.06em" }}>
              {unfiled} unfiled
            </text>
          </g>
        )}
      </svg>

      {territories.length === 0 && unfiled === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="rounded-pill border border-hairline bg-panel-solid px-4 py-2 text-[12px] text-muted">
            No topics yet — record a note to begin
          </p>
        </div>
      )}
    </div>
  );
}
