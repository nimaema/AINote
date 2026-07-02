"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DotsThreeVertical, PencilSimple, Palette, Trash, Check, X } from "@phosphor-icons/react";
import { PROJECT_COLORS, type ProjectColor } from "@/lib/projects";

export function ProjectActions({
  id,
  name,
  color,
}: {
  id: string;
  name: string;
  color: string;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    const n = value.trim();
    setRenaming(false);
    setMenu(false);
    if (n && n !== name) await patch({ name: n });
    else setValue(name);
  }

  async function remove() {
    if (!confirm(`Delete project "${name}"? Its recordings are kept and just detached.`)) return;
    setBusy(true);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        disabled={busy}
        className="glass grid h-10 w-10 place-items-center rounded-btn text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 cursor-pointer"
        aria-label="Project actions"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      {menu && !renaming && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 w-56 rounded-card p-1.5">
            <button
              onClick={() => { setRenaming(true); setValue(name); }}
              className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-ink-soft transition-colors hover:bg-white/70 cursor-pointer"
            >
              <PencilSimple size={16} /> Rename
            </button>

            <div className="px-3 pb-1 pt-2">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted">
                <Palette size={14} /> Color
              </p>
              <div className="flex items-center gap-1.5">
                {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => patch({ color: c })}
                    aria-label={c}
                    className={`grid h-6 w-6 place-items-center rounded-full transition-transform duration-150 ${
                      c === color ? "ring-2 ring-ink ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ background: PROJECT_COLORS[c] }}
                  >
                    {c === color && <Check size={12} weight="bold" className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-1 h-px bg-hairline" />
            <button
              onClick={() => { setMenu(false); remove(); }}
              className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-err transition-colors hover:bg-white/70 cursor-pointer"
            >
              <Trash size={16} /> Delete project
            </button>
          </div>
        </>
      )}

      {renaming && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setRenaming(false); setMenu(false); }} />
          <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 flex w-72 items-center gap-2 rounded-card p-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") { setRenaming(false); setMenu(false); setValue(name); }
              }}
              className="h-9 flex-1 rounded-input border border-hairline bg-white px-3 text-[14px] text-ink focus:border-accent focus:outline-none"
            />
            <button
              onClick={saveName}
              disabled={busy}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-ink text-white disabled:opacity-50 cursor-pointer"
              aria-label="Save name"
            >
              <Check size={16} weight="bold" />
            </button>
            <button
              onClick={() => { setRenaming(false); setMenu(false); setValue(name); }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-input text-muted hover:bg-white cursor-pointer"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
