"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  ArrowClockwise,
  WaveSawtooth,
  ListChecks,
  Globe,
  Translate,
  Check,
  X,
} from "@phosphor-icons/react";
import { ProjectPicker } from "@/components/projects/project-picker";
import { projectColor } from "@/lib/projects";

export type RecItem = {
  id: string;
  title: string;
  status: string;
  source: "record" | "upload";
  dateLabel: string;
  durationLabel: string;
  isPublic: boolean;
  language: string | null;
  summary: string | null;
  topics: string[];
  actionCount: number;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "done", label: "Ready" },
  { key: "active", label: "Processing" },
  { key: "failed", label: "Failed" },
] as const;

const STATUS: Record<string, { label: string; dot: string; text: string; note: string }> = {
  uploaded: { label: "Queued", dot: "bg-faint", text: "text-muted", note: "Queued for transcription…" },
  transcribing: { label: "Transcribing", dot: "bg-accent", text: "text-accent-deep", note: "Transcribing the audio…" },
  processing: { label: "Summarizing", dot: "bg-accent", text: "text-accent-deep", note: "Writing the summary…" },
  done: { label: "Ready", dot: "bg-ok", text: "text-ok", note: "" },
  failed: { label: "Failed", dot: "bg-err", text: "text-err", note: "Processing failed — retry from the menu." },
};

export function RecordingsList({
  items,
  heading = "Your captures",
  hideProject = false,
}: {
  items: RecItem[];
  heading?: string;
  hideProject?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const matchesFilter = (status: string, key: string) =>
    key === "all" ||
    (key === "done" && status === "done") ||
    (key === "failed" && status === "failed") ||
    (key === "active" && ["uploaded", "transcribing", "processing"].includes(status));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (r) =>
        matchesFilter(r.status, filter) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          (r.summary ?? "").toLowerCase().includes(needle) ||
          r.topics.some((t) => t.toLowerCase().includes(needle)))
    );
  }, [items, q, filter]);

  async function act(id: string, fn: () => Promise<Response>) {
    setBusy(id);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  const rename = (id: string, title: string) =>
    act(id, () =>
      fetch(`/api/recordings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
    );
  const remove = (id: string) => act(id, () => fetch(`/api/recordings/${id}`, { method: "DELETE" }));
  const retry = (id: string) => act(id, () => fetch(`/api/recordings/${id}/retry`, { method: "POST" }));

  return (
    <section aria-labelledby="recent-heading" className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 id="recent-heading" className="font-display text-[18px] font-bold tracking-tight text-ink">
          {heading}
        </h2>
        <div className="relative">
          <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes"
            className="h-9 w-full min-w-0 rounded-btn border border-hairline bg-white/70 pl-8 pr-3 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)] transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] sm:w-52"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 px-1">
        {FILTERS.map((f) => {
          const count = items.filter((r) => matchesFilter(r.status, f.key)).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-btn border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                active ? "border-transparent bg-ink text-white" : "border-hairline text-muted hover:bg-white/60 hover:text-ink"
              }`}
            >
              {f.label}
              <span className={`tabular font-mono text-[11px] ${active ? "text-white/70" : "text-faint"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={items.length > 0} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <RecordingCard
              key={r.id}
              rec={r}
              busy={busy === r.id}
              hideProject={hideProject}
              onRename={(t) => rename(r.id, t)}
              onDelete={() => remove(r.id)}
              onRetry={() => retry(r.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecordingCard({
  rec,
  busy,
  hideProject,
  onRename,
  onDelete,
  onRetry,
}: {
  rec: RecItem;
  busy: boolean;
  hideProject?: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rec.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = STATUS[rec.status] ?? STATUS.uploaded;
  const extraTopics = Math.max(0, rec.topics.length - 3);

  function saveRename() {
    const t = title.trim();
    setEditing(false);
    if (t && t !== rec.title) onRename(t);
    else setTitle(rec.title);
  }

  return (
    <li className="group glass-soft relative flex min-h-[150px] flex-col gap-3 rounded-card bg-white/55 p-4 transition-[transform,background-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-white/85">
      {/* Whole-card click target (disabled while renaming) */}
      {!editing && (
        <Link href={`/note/${rec.id}`} className="absolute inset-0 z-0 rounded-card" aria-label={`Open ${rec.title}`} />
      )}

      {/* Header */}
      <div className="pointer-events-none relative z-10 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
          <WaveSawtooth size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="pointer-events-auto flex items-center gap-1.5">
              <input
                ref={inputRef}
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") { setTitle(rec.title); setEditing(false); }
                }}
                className="h-8 w-full rounded-input border border-accent bg-white px-2.5 text-[14px] text-ink focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
              />
              <button onClick={saveRename} className="grid h-8 w-8 shrink-0 place-items-center rounded-input text-ok hover:bg-white cursor-pointer" aria-label="Save name">
                <Check size={16} weight="bold" />
              </button>
              <button onClick={() => { setTitle(rec.title); setEditing(false); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-input text-muted hover:bg-white cursor-pointer" aria-label="Cancel">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 pr-6">
                <p className="truncate text-[15px] font-semibold text-ink">{rec.title}</p>
                {rec.isPublic && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-btn bg-accent-wash px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-accent-deep"
                    title="Shared with your workspace"
                  >
                    <Globe size={10} weight="bold" /> Public
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-faint">
                <span>{rec.dateLabel}</span>
                <span>·</span>
                <span>{rec.durationLabel}</span>
                <span>·</span>
                <span>{rec.source === "record" ? "Recorded" : "Uploaded"}</span>
                {rec.language && (
                  <span className="inline-flex items-center gap-1 text-accent-deep">
                    <Translate size={11} weight="bold" /> {rec.language}
                  </span>
                )}
                {!hideProject && rec.projectId && rec.projectName && (
                  <span className="inline-flex items-center gap-1 text-ink-soft">
                    <span className="h-2 w-2 rounded-full" style={{ background: projectColor(rec.projectColor) }} />
                    {rec.projectName}
                  </span>
                )}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-0.5">
            <ProjectPicker recordingId={rec.id} currentProjectId={rec.projectId} variant="icon" />
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                disabled={busy}
                className="grid h-8 w-8 place-items-center rounded-input text-muted transition-colors duration-150 hover:bg-white disabled:opacity-50 cursor-pointer"
                aria-label="More actions"
              >
                <DotsThreeVertical size={18} weight="bold" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                  <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-card p-1.5">
                    <MenuItem icon={<PencilSimple size={15} />} label="Rename" onClick={() => { setMenu(false); setEditing(true); }} />
                    {rec.status === "failed" && (
                      <MenuItem icon={<ArrowClockwise size={15} />} label="Retry" onClick={() => { setMenu(false); onRetry(); }} />
                    )}
                    <MenuItem
                      icon={<Trash size={15} />}
                      label="Delete"
                      danger
                      onClick={() => { setMenu(false); if (confirm(`Delete "${rec.title}"? This can't be undone.`)) onDelete(); }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body: summary preview or status note */}
      <p className={`pointer-events-none relative z-10 line-clamp-2 flex-1 text-[13.5px] leading-relaxed ${rec.summary ? "text-ink-soft" : "text-muted"}`}>
        {rec.summary || s.note}
      </p>

      {/* Footer: topics + action count + status */}
      <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {rec.topics.slice(0, 3).map((t, i) => (
            <span key={i} className="max-w-[9rem] truncate rounded-btn bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent-deep">
              {t}
            </span>
          ))}
          {extraTopics > 0 && <span className="text-[11px] text-faint">+{extraTopics}</span>}
          {rec.actionCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
              <ListChecks size={13} /> {rec.actionCount}
            </span>
          )}
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 ${s.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${["transcribing", "processing"].includes(rec.status) ? "animate-pulse" : ""}`} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em]">{s.label}</span>
        </span>
      </div>
    </li>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-white/70 cursor-pointer ${
        danger ? "text-err" : "text-ink-soft"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="glass-soft grid place-items-center rounded-panel px-6 py-14 text-center">
      <WaveSawtooth size={26} className="text-faint" />
      <p className="mt-3 text-[14px] font-medium text-ink">{hasAny ? "No matches" : "Nothing captured yet"}</p>
      <p className="mt-1 text-[13px] text-muted">
        {hasAny ? "Try a different search or filter." : "Record or upload audio to get started."}
      </p>
    </div>
  );
}
