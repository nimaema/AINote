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
import { DropMenu } from "@/components/ui/drop-menu";

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
  uploaded: { label: "Queued", dot: "bg-faint", text: "text-muted", note: "Queued for transcription..." },
  transcribing: { label: "Transcribing", dot: "bg-accent", text: "text-accent-deep", note: "Transcribing the audio..." },
  processing: { label: "Summarizing", dot: "bg-accent", text: "text-accent-deep", note: "Writing the summary..." },
  done: { label: "Ready", dot: "bg-ok", text: "text-ok", note: "" },
  failed: { label: "Failed", dot: "bg-err", text: "text-err", note: "Processing failed. Retry from the menu." },
};

export function RecordingsList({
  items,
  heading = "Captures",
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
    <section aria-labelledby="recent-heading" className="glass mt-5 rounded-panel">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-4 py-2.5">
        <h2 id="recent-heading" className="text-[14px] font-semibold text-ink">
          {heading}
          <span className="tabular ml-2 font-mono text-[11.5px] font-normal text-faint">{filtered.length}</span>
        </h2>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-8 w-36 min-w-0 rounded-input border border-hairline bg-bg pl-[1.85rem] pr-2.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)] transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] sm:w-48"
            />
          </div>

          {/* Segmented filter */}
          <div className="flex items-center rounded-btn border border-hairline bg-bg p-0.5">
            {FILTERS.map((f) => {
              const count = items.filter((r) => matchesFilter(r.status, f.key)).length;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                    active ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {f.label}
                  <span className={`tabular font-mono text-[10.5px] ${active ? "text-faint" : "text-faint/80"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={items.length > 0} />
      ) : (
        <ul className="divide-y divide-hairline">
          {filtered.map((r) => (
            <RecordingRow
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

function RecordingRow({
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
  const kebabRef = useRef<HTMLButtonElement>(null);
  const s = STATUS[rec.status] ?? STATUS.uploaded;

  function saveRename() {
    const t = title.trim();
    setEditing(false);
    if (t && t !== rec.title) onRename(t);
    else setTitle(rec.title);
  }

  return (
    <li className="group relative flex items-start gap-3 px-4 py-3 transition-colors duration-150 [transition-timing-function:var(--ease-out)] first:rounded-t-[11px] last:rounded-b-[11px] hover:bg-panel">
      {/* Whole-row click target (disabled while renaming) */}
      {!editing && (
        <Link href={`/note/${rec.id}`} className="absolute inset-0 z-0" aria-label={`Open ${rec.title}`} />
      )}

      <span className="pointer-events-none relative z-10 mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-input border border-hairline bg-bg text-accent-deep">
        <WaveSawtooth size={17} weight="duotone" />
      </span>

      <div className="pointer-events-none relative z-10 min-w-0 flex-1">
        {editing ? (
          <div className="pointer-events-auto flex max-w-md items-center gap-1.5">
            <input
              ref={inputRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") { setTitle(rec.title); setEditing(false); }
              }}
              className="h-8 w-full rounded-input border border-accent bg-bg px-2.5 text-[13.5px] text-ink focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)]"
            />
            <button onClick={saveRename} className="grid h-8 w-8 shrink-0 place-items-center rounded-input text-ok hover:bg-panel-lift cursor-pointer" aria-label="Save name">
              <Check size={15} weight="bold" />
            </button>
            <button onClick={() => { setTitle(rec.title); setEditing(false); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-input text-muted hover:bg-panel-lift cursor-pointer" aria-label="Cancel">
              <X size={15} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14px] font-medium text-ink">{rec.title}</p>
              {rec.isPublic && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-accent-wash px-1.5 py-0.5 text-[11px] font-medium text-accent-deep"
                  title="Shared with your workspace"
                >
                  <Globe size={10} weight="bold" /> Public
                </span>
              )}
            </div>
            {(rec.summary || s.note) && (
              <p className={`mt-0.5 line-clamp-1 text-[12.5px] ${rec.summary ? "text-muted" : "text-faint"}`}>
                {rec.summary || s.note}
              </p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10.5px] text-faint">
              <span>{rec.dateLabel}</span>
              <span>{rec.durationLabel}</span>
              {rec.language && (
                <span className="inline-flex items-center gap-1">
                  <Translate size={10.5} weight="bold" /> {rec.language}
                </span>
              )}
              {rec.actionCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks size={10.5} /> {rec.actionCount}
                </span>
              )}
              {!hideProject && rec.projectId && rec.projectName && (
                <span className="inline-flex items-center gap-1 text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: projectColor(rec.projectColor) }} />
                  {rec.projectName}
                </span>
              )}
            </p>
          </>
        )}
      </div>

      {/* Right rail: status + actions */}
      {!editing && (
        <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-1.5 self-center">
          <span className={`hidden items-center gap-1.5 sm:flex ${s.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${["transcribing", "processing"].includes(rec.status) ? "animate-pulse" : ""}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em]">{s.label}</span>
          </span>

          <div className="flex items-center gap-0.5 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <ProjectPicker recordingId={rec.id} currentProjectId={rec.projectId} variant="icon" />
            <button
              ref={kebabRef}
              onClick={() => setMenu((m) => !m)}
              disabled={busy}
              className="grid h-8 w-8 place-items-center rounded-input text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink disabled:opacity-50 cursor-pointer"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <DotsThreeVertical size={17} weight="bold" />
            </button>
            <DropMenu open={menu} onClose={() => setMenu(false)} anchor={kebabRef} align="end" width={168} className="p-1">
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
            </DropMenu>
          </div>
        </div>
      )}
    </li>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer ${
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
    <div className="grid place-items-center px-6 py-14 text-center">
      <WaveSawtooth size={24} className="text-faint" />
      <p className="mt-3 text-[13.5px] font-medium text-ink">{hasAny ? "No matches" : "Nothing captured yet"}</p>
      <p className="mt-1 text-[12.5px] text-muted">
        {hasAny ? "Try a different search or filter." : "Record or upload audio to get started."}
      </p>
    </div>
  );
}
