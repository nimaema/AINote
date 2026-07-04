"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Check,
} from "@phosphor-icons/react";
import { DropMenu } from "@/components/ui/drop-menu";

export function NoteActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

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
    <>
      <button
        ref={btnRef}
        onClick={() => setMenu((m) => !m)}
        disabled={busy}
        className="glass grid h-10 w-10 place-items-center rounded-btn text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 cursor-pointer"
        aria-label="Recording actions"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      <DropMenu open={menu && !renaming} onClose={() => setMenu(false)} anchor={btnRef} align="end" width={176}>
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
      </DropMenu>

      <DropMenu
        open={renaming}
        onClose={() => { setRenaming(false); setMenu(false); setValue(title); }}
        anchor={btnRef}
        align="end"
        width={288}
        className="p-2"
      >
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setRenaming(false); setMenu(false); setValue(title); }
            }}
            className="h-9 min-w-0 flex-1 rounded-input border border-hairline bg-bg px-3 text-[14px] text-ink focus:border-accent focus:outline-none"
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
      </DropMenu>
    </>
  );
}
