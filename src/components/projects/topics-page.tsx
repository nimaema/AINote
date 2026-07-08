"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stack,
  Plus,
  Check,
  X,
  FolderSimple,
  ListChecks,
  UsersThree,
  Tray,
  ArrowRight,
} from "@phosphor-icons/react";
import { PROJECT_COLORS, projectColor, type ProjectColor } from "@/lib/projects";
import { ProjectActions } from "@/components/projects/project-actions";

export type TopicItem = {
  id: string;
  name: string;
  color: string;
  count: number;
  readyCount: number;
  activeCount: number;
  actionCount: number;
  memberCount: number;
  lastActivityLabel: string;
  role: "owner" | "editor" | "viewer";
};

export function TopicsPage({ items, unfiled }: { items: TopicItem[]; unfiled: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>("sky");
  const [busy, setBusy] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, color }),
      });
      if (res.ok) {
        setName("");
        setColor("sky");
        setCreating(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const totalNotes = items.reduce((a, t) => a + t.count, 0);
  const totalActions = items.reduce((a, t) => a + t.actionCount, 0);

  return (
    <main className="mx-auto max-w-[1200px] px-3 pb-28 pt-3 sm:px-5 md:px-7 md:pb-12 md:pt-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline px-1 pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Workspace</p>
          <h1 className="mt-1.5 font-display text-[28px] leading-none text-ink">Topics</h1>
          <p className="mt-2 text-[13.5px] text-muted">
            {items.length > 0
              ? `${items.length} ${items.length === 1 ? "topic" : "topics"} · ${totalNotes} ${totalNotes === 1 ? "note" : "notes"} · ${totalActions} open ${totalActions === 1 ? "action" : "actions"}`
              : "Group related recordings so you can browse them together and ask across all of them."}
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 rounded-btn bg-ink px-4 text-[13.5px] font-semibold text-bg transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-ink-soft active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} weight="bold" /> New topic
          </button>
        )}
      </header>

      {creating && (
        <div className="glass mt-5 flex flex-wrap items-center gap-3 rounded-panel p-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Topic name"
            className="h-10 min-w-0 flex-1 rounded-input border border-hairline bg-bg px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />
          <div className="flex items-center gap-1.5">
            {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`grid h-7 w-7 place-items-center rounded-full transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer ${
                  color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : "hover:scale-110"
                }`}
                style={{ background: PROJECT_COLORS[c] }}
              >
                {color === c && <Check size={13} weight="bold" className="text-bg" />}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-btn bg-accent px-4 text-[13.5px] font-semibold text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setCreating(false)}
            className="grid h-10 w-10 place-items-center rounded-btn text-muted hover:bg-panel-lift hover:text-ink cursor-pointer"
            aria-label="Cancel"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {items.length === 0 && !creating ? (
        <div className="glass mt-5 grid place-items-center rounded-panel px-6 py-16 text-center">
          <Stack size={28} className="text-faint" />
          <p className="mt-3 text-[14px] font-semibold text-ink">No topics yet</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            Create your first topic, then file related recordings into it from any note.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <article
              key={t.id}
              className="tile-lift group relative flex flex-col overflow-hidden rounded-card border border-hairline bg-panel-solid"
            >
              <span className="h-[3px] w-full shrink-0" style={{ background: projectColor(t.color) }} aria-hidden />
              <Link href={`/project/${t.id}`} className="absolute inset-0 z-0" aria-label={`Open ${t.name}`} />
              <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-bg"
                    style={{ background: projectColor(t.color) }}
                  >
                    <FolderSimple size={19} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-ink">{t.name}</h2>
                    <p className="mt-0.5 font-mono text-[11px] text-faint">
                      {t.role === "owner" ? "You own this" : `Shared · ${t.role}`}
                    </p>
                  </div>
                  {t.role === "owner" && (
                    <div className="pointer-events-auto -mr-1.5 -mt-1.5 shrink-0">
                      <ProjectActions id={t.id} name={t.name} color={t.color} />
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                  <Stat value={t.count} label="notes" />
                  <Stat value={t.actionCount} label="actions" icon={<ListChecks size={11} />} />
                  <Stat value={t.memberCount} label={t.memberCount === 1 ? "member" : "members"} icon={<UsersThree size={11} />} />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="font-mono text-[11px] text-faint">{t.lastActivityLabel}</p>
                  <ArrowRight
                    size={15}
                    className="text-faint transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </div>
              </div>
            </article>
          ))}

          {unfiled > 0 && (
            <Link
              href="/"
              className="tile-lift flex flex-col justify-center gap-2 rounded-card border border-dashed border-hairline-strong bg-bg p-4"
            >
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-panel text-muted">
                <Tray size={19} weight="duotone" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink">Unfiled</p>
                <p className="mt-0.5 font-mono text-[11px] text-faint">
                  {unfiled} {unfiled === 1 ? "note" : "notes"} not in a topic
                </p>
              </div>
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="tabular text-[18px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-faint">
        {icon}
        {label}
      </p>
    </div>
  );
}
