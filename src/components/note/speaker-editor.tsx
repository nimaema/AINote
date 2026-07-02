"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, X, Check } from "@phosphor-icons/react";

// Owner-only: rename raw speaker labels (A, B, …) to real names. Colors are
// keyed to the raw label, so they stay stable across renames.
export function SpeakerEditor({
  recordingId,
  speakers,
  initialNames,
  colors,
}: {
  recordingId: string;
  speakers: string[]; // raw labels, in order of appearance
  initialNames: Record<string, string>;
  colors: Record<string, string>; // raw label -> color (functions can't cross the RSC boundary)
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(speakers.map((s) => [s, initialNames[s] ?? ""]))
  );

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/speakers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      /* keep panel open on failure */
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-btn border border-hairline bg-white/60 px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-accent hover:text-accent-deep cursor-pointer"
      >
        <PencilSimple size={13} /> Rename speakers
      </button>
    );
  }

  return (
    <div className="rounded-card border border-hairline bg-white/70 p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-ink">Rename speakers</p>
        <button
          onClick={() => setOpen(false)}
          className="grid h-6 w-6 place-items-center rounded-input text-muted hover:bg-white cursor-pointer"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid gap-2">
        {speakers.map((raw) => {
          const short = raw.replace(/^speaker\s+/i, "") || raw;
          const initial = (names[raw]?.trim() || short || raw).charAt(0).toUpperCase();
          const label = /^speaker\s+/i.test(raw) ? raw : `Speaker ${raw}`;
          return (
            <div key={raw} className="flex items-center gap-2.5">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: colors[raw] }}
                title={label}
              >
                {initial}
              </span>
              <input
                value={names[raw]}
                onChange={(e) => setNames((n) => ({ ...n, [raw]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder={label}
                className="h-9 flex-1 rounded-input border border-hairline bg-white px-3 text-[13.5px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => setOpen(false)}
          className="h-9 rounded-btn px-3.5 text-[13px] font-medium text-muted hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-btn bg-ink px-4 text-[13px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <Check size={15} weight="bold" /> {busy ? "Saving…" : "Save names"}
        </button>
      </div>
    </div>
  );
}
