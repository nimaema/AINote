// Pure, DB-free project helpers — safe to import from client components.
// The DB-bound getOwnedProject lives in ./projects-server.ts.

export const PROJECT_COLORS = {
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  teal: "#12a594",
  rose: "#e0518a",
  amber: "#d98324",
  slate: "#64748b",
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;

export function projectColor(key?: string | null): string {
  return PROJECT_COLORS[(key ?? "sky") as ProjectColor] ?? PROJECT_COLORS.sky;
}

export function isProjectColor(v: unknown): v is ProjectColor {
  return typeof v === "string" && v in PROJECT_COLORS;
}
