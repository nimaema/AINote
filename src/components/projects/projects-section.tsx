"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderSimple, Plus, Check, X } from "@phosphor-icons/react";
import { PROJECT_COLORS, projectColor, type ProjectColor } from "@/lib/projects";

type ProjectRow = { id: string; name: string; color: string; count: number };

export function ProjectsSection({ projects }: { projects: ProjectRow[] }) {
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

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">Projects</h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-btn border border-hairline bg-white/70 px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-accent hover:text-accent-deep cursor-pointer"
          >
            <Plus size={14} weight="bold" /> New project
          </button>
        )}
      </div>

      {creating && (
        <div className="glass-soft mb-3 flex flex-wrap items-center gap-2.5 rounded-card p-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Project name"
            className="h-9 min-w-0 flex-1 rounded-input border border-hairline bg-white px-3 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />
          <div className="flex items-center gap-1.5">
            {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`grid h-6 w-6 place-items-center rounded-full transition-transform duration-150 ${color === c ? "ring-2 ring-offset-2 ring-ink" : ""}`}
                style={{ background: PROJECT_COLORS[c] }}
              >
                {color === c && <Check size={12} weight="bold" className="text-white" />}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-ink px-4 text-[13px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setCreating(false)}
            className="grid h-9 w-9 place-items-center rounded-btn text-muted hover:text-ink cursor-pointer"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        !creating && (
          <div className="glass-soft flex items-center gap-3 rounded-card px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
              <FolderSimple size={18} weight="duotone" />
            </span>
            <p className="text-[13.5px] text-muted">
              Group related recordings into a project to navigate them together and ask the AI across
              all of them.
            </p>
          </div>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="glass-soft group flex min-w-[190px] flex-col gap-3 rounded-card bg-white/60 p-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-white/90 cursor-pointer"
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-input text-white"
                style={{ background: projectColor(p.color) }}
              >
                <FolderSimple size={18} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-ink">{p.name}</p>
                <p className="tabular mt-0.5 font-mono text-[11px] text-faint">
                  {p.count} {p.count === 1 ? "recording" : "recordings"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
