"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Check,
} from "@phosphor-icons/react";

export function NoteActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);

  async function save() {
    const t = value.trim();
    if (!t || t === title) {
      setRenaming(false);
      setValue(title);
      return;
    }
    setBusy(true);
    await fetch(`/api/recordings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    setBusy(false);
    setRenaming(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${title}"? This removes the audio, transcript, and notes.`)) return;
    setBusy(true);
    await fetch(`/api/recordings/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        disabled={busy}
        className="glass grid h-10 w-10 place-items-center rounded-btn text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 cursor-pointer"
        aria-label="Recording actions"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      {menu && !renaming && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-card p-1.5">
            <button
              onClick={() => { setRenaming(true); setValue(title); }}
              className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer"
            >
              <PencilSimple size={16} /> Rename
            </button>
            <button
              onClick={() => { setMenu(false); remove(); }}
              className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-err transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer"
            >
              <Trash size={16} /> Delete
            </button>
          </div>
        </>
      )}

      {renaming && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setRenaming(false); setMenu(false); }} />
          <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 flex w-72 items-center gap-2 rounded-card p-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") { setRenaming(false); setMenu(false); setValue(title); }
              }}
              className="h-9 flex-1 rounded-input border border-hairline bg-bg px-3 text-[14px] text-ink focus:border-accent focus:outline-none"
            />
            <button
              onClick={save}
              disabled={busy}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-accent text-accent-ink disabled:opacity-50 cursor-pointer"
              aria-label="Save name"
            >
              <Check size={16} weight="bold" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
