"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderSimple, Plus, Check, X, MapPinSimpleArea, CaretDown } from "@phosphor-icons/react";
import { projectColor } from "@/lib/projects";
import { DropMenu } from "@/components/ui/drop-menu";

type Project = { id: string; name: string; color: string };

export function ProjectPicker({
  recordingId,
  currentProjectId,
  currentProjectName,
  currentProjectColor,
  variant = "menu",
}: {
  recordingId: string;
  currentProjectId: string | null;
  currentProjectName?: string | null;
  currentProjectColor?: string | null;
  variant?: "menu" | "chip" | "icon" | "territory";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && projects === null) {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => setProjects(d.projects ?? []))
        .catch(() => setProjects([]));
    }
  }, [open, projects]);

  async function assign(projectId: string | null) {
    setBusy(true);
    try {
      await fetch(`/api/recordings/${recordingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createAndAssign() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.project?.id) await assign(data.project.id);
    } finally {
      setBusy(false);
      setCreating(false);
      setNewName("");
    }
  }

  const btnRef = useRef<HTMLButtonElement>(null);

  const trigger =
    variant === "territory" ? (
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={currentProjectId ? `Project: ${currentProjectName}` : "Assign to a project"}
        title={currentProjectId ? "Change project" : "Assign to a project"}
        className={`pointer-events-auto inline-flex h-7 max-w-[11rem] items-center gap-1.5 rounded-pill border px-2.5 text-[11.5px] font-medium transition-[background-color,border-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer ${
          currentProjectId
            ? "border-transparent bg-lock-wash text-lock hover:bg-lock/15"
            : "border-dashed border-hairline-strong text-muted hover:border-lock hover:text-lock"
        }`}
      >
        {currentProjectId ? (
          <>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: projectColor(currentProjectColor) }}
            />
            <span className="truncate">{currentProjectName}</span>
            <CaretDown size={11} weight="bold" className="shrink-0 opacity-70" />
          </>
        ) : (
          <>
            <MapPinSimpleArea size={13} weight="bold" className="shrink-0" />
            Assign project
          </>
        )}
      </button>
    ) : variant === "icon" ? (
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-input text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink cursor-pointer"
        aria-label="Move to project"
        title="Move to project"
      >
        <FolderSimple size={16} />
      </button>
    ) : variant === "chip" ? (
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-btn glass px-3.5 text-[13px] font-medium text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer"
      >
        <FolderSimple size={15} /> Project
      </button>
    ) : (
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-[13.5px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer"
      >
        <FolderSimple size={15} /> Move to project…
      </button>
    );

  return (
    <>
      {trigger}
      <DropMenu open={open} onClose={() => setOpen(false)} anchor={btnRef} align="end" width={224}>
        <div>
            <div className="max-h-64 overflow-y-auto">
              {currentProjectId && (
                <button
                  onClick={() => assign(null)}
                  disabled={busy}
                  className="flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:bg-panel-lift disabled:opacity-50 cursor-pointer"
                >
                  <X size={14} /> Remove from project
                </button>
              )}
              {projects === null ? (
                <p className="px-2.5 py-2 text-[13px] text-faint">Loading…</p>
              ) : projects.length === 0 && !creating ? (
                <p className="px-2.5 py-2 text-[12.5px] text-muted">No projects yet.</p>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => assign(p.id)}
                    disabled={busy}
                    className="flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-[13.5px] text-ink-soft transition-colors hover:bg-panel-lift disabled:opacity-50 cursor-pointer"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: projectColor(p.color) }} />
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.id === currentProjectId && <Check size={14} className="text-ok" />}
                  </button>
                ))
              )}
            </div>

            <div className="mt-1 border-t border-hairline pt-1">
              {creating ? (
                <div className="flex items-center gap-1.5 p-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createAndAssign();
                      if (e.key === "Escape") setCreating(false);
                    }}
                    placeholder="Project name"
                    className="h-8 flex-1 rounded-input border border-accent bg-bg px-2.5 text-[13px] text-ink focus:outline-none"
                  />
                  <button
                    onClick={createAndAssign}
                    disabled={busy || !newName.trim()}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-input bg-accent text-accent-ink disabled:opacity-40 cursor-pointer"
                    aria-label="Create"
                  >
                    <Check size={15} weight="bold" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-[13px] font-medium text-accent-deep transition-colors hover:bg-accent-wash cursor-pointer"
                >
                  <Plus size={15} weight="bold" /> New project
                </button>
              )}
            </div>
        </div>
      </DropMenu>
    </>
  );
}
