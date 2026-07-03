// Small formatting helpers. Time-relative values are computed on the server and
// passed as strings so client components don't re-derive them (avoids hydration
// drift from Date.now()).

export type DateInput = Date | string | number | null | undefined;

export function asDate(value: DateInput): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function relativeTime(value: DateInput, now = new Date()): string {
  const date = asDate(value);
  if (!date) return "unknown";

  const s = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dateTimeLabel(value: DateInput): string {
  const date = asDate(value);
  if (!date) return "Unknown date";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function humanDuration(sec: number | null | undefined): string {
  if (!sec || sec < 0) return "-";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m < 60) return `${m}:${s.toString().padStart(2, "0")}`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

// Total minutes phrased for a stat readout ("3h 12m", "47m").
export function humanTotalTime(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

export function humanBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
