// Pure, DB-free project helpers. Safe to import from client components.
// The DB-bound getOwnedProject lives in ./projects-server.ts.

export const PROJECT_COLORS = {
  sky: "#8ea0c7",
  violet: "#9d8bb3",
  teal: "#6fb7a8",
  rose: "#c67676",
  amber: "#dca85a",
  slate: "#8d9286",
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;

export function projectColor(key?: string | null): string {
  return PROJECT_COLORS[(key ?? "sky") as ProjectColor] ?? PROJECT_COLORS.sky;
}

export function isProjectColor(v: unknown): v is ProjectColor {
  return typeof v === "string" && v in PROJECT_COLORS;
}
