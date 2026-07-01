"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  ArrowClockwise,
  ArrowRight,
  WaveSawtooth,
  Check,
  X,
} from "@phosphor-icons/react";

export type RecItem = {
  id: string;
  title: string;
  status: string;
  source: "record" | "upload";
  dateLabel: string;
  durationLabel: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "done", label: "Ready" },
  { key: "active", label: "Processing" },
  { key: "failed", label: "Failed" },
] as const;

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  uploaded: { label: "Queued", dot: "bg-faint", text: "text-muted" },
  transcribing: { label: "Transcribing", dot: "bg-accent", text: "text-accent-deep" },
  processing: { label: "Summarizing", dot: "bg-accent", text: "text-accent-deep" },
  done: { label: "Ready", dot: "bg-ok", text: "text-ok" },
  failed: { label: "Failed", dot: "bg-err", text: "text-err" },
};

export function RecordingsList({ items }: { items: RecItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((r) => {
      if (needle && !r.title.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      if (filter === "done") return r.status === "done";
      if (filter === "failed") return r.status === "failed";
      if (filter === "active")
        return ["uploaded", "transcribing", "processing"].includes(r.status);
      return true;
    });
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
  const remove = (id: string) =>
    act(id, () => fetch(`/api/recordings/${id}`, { method: "DELETE" }));
  const retry = (id: string) =>
    act(id, () => fetch(`/api/recordings/${id}/retry`, { method: "POST" }));

  return (
    <section aria-labelledby="recent-heading" className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 id="recent-heading" className="font-display text-[18px] font-bold tracking-tight text-ink">
          Your captures
        </h2>
        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-9 w-44 rounded-btn border border-hairline bg-white/70 pl-8 pr-3 text-[13px] text-ink placeholder:text-faint focus:w-56 focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)] transition-[width,border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)]"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 px-1">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? items.length
              : f.key === "done"
                ? items.filter((r) => r.status === "done").length
                : f.key === "failed"
                  ? items.filter((r) => r.status === "failed").length
                  : items.filter((r) =>
                      ["uploaded", "transcribing", "processing"].includes(r.status)
                    ).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-btn border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                active
                  ? "border-transparent bg-ink text-white"
                  : "border-hairline text-muted hover:text-ink hover:bg-white/60"
              }`}
            >
              {f.label}
              <span className={`tabular font-mono text-[11px] ${active ? "text-white/70" : "text-faint"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={items.length > 0} />
      ) : (
        <ul className="grid gap-2.5">
          {filtered.map((r) => (
            <RecordingCard
              key={r.id}
              rec={r}
              busy={busy === r.id}
              onOpen={() => router.push(`/note/${r.id}`)}
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
  onOpen,
  onRename,
  onDelete,
  onRetry,
}: {
  rec: RecItem;
  busy: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rec.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = STATUS[rec.status] ?? STATUS.uploaded;

  function saveRename() {
    const t = title.trim();
    setEditing(false);
    if (t && t !== rec.title) onRename(t);
    else setTitle(rec.title);
  }

  return (
    <li className="group glass-soft relative flex items-center gap-4 rounded-card bg-white/50 px-4 py-3.5 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-white/80">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
        <WaveSawtooth size={18} weight="duotone" />
      </span>

      <button
        onClick={editing ? undefined : onOpen}
        className="min-w-0 flex-1 text-left cursor-pointer"
        disabled={editing}
      >
        {editing ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") {
                  setTitle(rec.title);
                  setEditing(false);
                }
              }}
              className="h-8 w-full max-w-sm rounded-input border border-accent bg-white px-2.5 text-[14.5px] text-ink focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
            />
            <button onClick={saveRename} className="grid h-8 w-8 place-items-center rounded-input text-ok hover:bg-white cursor-pointer" aria-label="Save name">
              <Check size={16} weight="bold" />
            </button>
            <button
              onClick={() => {
                setTitle(rec.title);
                setEditing(false);
              }}
              className="grid h-8 w-8 place-items-center rounded-input text-muted hover:bg-white cursor-pointer"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <span className="block truncate text-[14.5px] font-medium text-ink">{rec.title}</span>
            <span className="mt-0.5 flex items-center gap-2 font-mono text-[11.5px] text-faint">
              <span>{rec.dateLabel}</span>
              <span>·</span>
              <span>{rec.durationLabel}</span>
              <span>·</span>
              <span>{rec.source === "record" ? "Recorded" : "Uploaded"}</span>
            </span>
          </>
        )}
      </button>

      {!editing && (
        <>
          <span className={`hidden items-center gap-1.5 sm:inline-flex ${s.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${["transcribing", "processing"].includes(rec.status) ? "animate-pulse" : ""}`} />
            <span className="font-mono text-[11px] uppercase tracking-[0.1em]">{s.label}</span>
          </span>

          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              disabled={busy}
              className="grid h-8 w-8 place-items-center rounded-input text-muted opacity-0 transition-opacity duration-150 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50 cursor-pointer"
              aria-label="More actions"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="glass absolute right-0 top-full z-40 mt-1 w-40 overflow-hidden rounded-card p-1.5">
                  <MenuItem icon={<PencilSimple size={15} />} label="Rename" onClick={() => { setMenu(false); setEditing(true); }} />
                  {rec.status === "failed" && (
                    <MenuItem icon={<ArrowClockwise size={15} />} label="Retry" onClick={() => { setMenu(false); onRetry(); }} />
                  )}
                  <MenuItem
                    icon={<Trash size={15} />}
                    label="Delete"
                    danger
                    onClick={() => {
                      setMenu(false);
                      if (confirm(`Delete "${rec.title}"? This can't be undone.`)) onDelete();
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <ArrowRight size={15} className="hidden text-faint transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 md:block" />
        </>
      )}
    </li>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
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
      <p className="mt-3 text-[14px] font-medium text-ink">
        {hasAny ? "No matches" : "Nothing captured yet"}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {hasAny ? "Try a different search or filter." : "Record or upload audio to get started."}
      </p>
    </div>
  );
}
