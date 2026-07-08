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
    <section className="mt-5">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[14px] font-semibold text-ink">
          Topics
          {projects.length > 0 && (
            <span className="tabular ml-2 font-mono text-[11.5px] font-normal text-faint">{projects.length}</span>
          )}
        </h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-7 items-center gap-1 rounded-input px-2 text-[12.5px] font-medium text-muted transition-[background-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel hover:text-ink active:scale-[0.98] cursor-pointer"
          >
            <Plus size={13} weight="bold" /> New
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
            placeholder="Topic name"
            className="h-9 min-w-0 flex-1 rounded-input border border-hairline bg-bg px-3 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />
          <div className="flex items-center gap-1.5">
            {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`grid h-6 w-6 place-items-center rounded-full transition-transform duration-150 ${color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : ""}`}
                style={{ background: PROJECT_COLORS[c] }}
              >
                {color === c && <Check size={12} weight="bold" className="text-bg" />}
              </button>
            ))}
          </div>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-accent px-4 text-[13px] font-semibold text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setCreating(false)}
            className="grid h-9 w-9 place-items-center rounded-btn text-muted hover:bg-panel hover:text-ink cursor-pointer"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        !creating && (
          <div className="glass-soft flex items-center gap-3 rounded-card px-4 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
              <FolderSimple size={16} weight="duotone" />
            </span>
            <p className="text-[13px] text-muted">
              Group related recordings into a project to browse them together and ask the AI across
              all of them.
            </p>
          </div>
        )
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="glass-soft flex min-w-0 shrink-0 items-center gap-2.5 rounded-card px-3 py-2 transition-[border-color,background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong hover:bg-panel-lift active:scale-[0.98] cursor-pointer"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-bg"
                style={{ background: projectColor(p.color) }}
              >
                <FolderSimple size={14} weight="fill" />
              </span>
              <span className="max-w-[11rem] truncate text-[13px] font-medium text-ink">{p.name}</span>
              <span className="tabular font-mono text-[11px] text-faint">{p.count}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
