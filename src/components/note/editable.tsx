"use client";

import { useState } from "react";
import { PencilSimple, Check, X, Plus, Trash, ArrowElbowDownRight } from "@phosphor-icons/react";

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// A block of prose that a permitted user can correct in place.
export function EditableText({
  value,
  canEdit,
  onSave,
  className = "",
}: {
  value: string;
  canEdit: boolean;
  onSave: (next: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full resize-y rounded-input border border-accent bg-bg px-3 py-2 text-[15px] leading-relaxed text-ink focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <SaveBtn
            saving={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(draft.trim());
              setSaving(false);
              setEditing(false);
            }}
          />
          <CancelBtn onClick={() => { setDraft(value); setEditing(false); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className={className}>{value}</p>
      {canEdit && <EditBtn onClick={() => { setDraft(value); setEditing(true); }} />}
    </div>
  );
}

// A list (decisions / follow-ups / topics) with optional trace chips in view
// mode and add/remove/edit line editing when a permitted user opens it.
export function EditableList({
  items,
  canEdit,
  onSave,
  variant = "list",
  tone = "lock",
  traces,
  onSeek,
  addLabel = "Add item",
}: {
  items: string[];
  canEdit: boolean;
  onSave: (next: string[]) => Promise<void>;
  variant?: "list" | "chips";
  tone?: "lock" | "warn";
  traces?: (number | null)[];
  onSeek?: (ms: number) => void;
  addLabel?: string;
}) {
  const [saved, setSaved] = useState(items);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [saving, setSaving] = useState(false);
  const dot = tone === "warn" ? "bg-warn" : "bg-lock";

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        {draft.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={line}
              onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
              className="h-9 flex-1 rounded-input border border-hairline bg-bg px-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)]"
            />
            <button
              onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              aria-label="Remove"
              className="grid h-8 w-8 place-items-center rounded-input text-faint hover:bg-panel-lift hover:text-err cursor-pointer"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setDraft((d) => [...d, ""])}
          className="inline-flex w-fit items-center gap-1 rounded-btn border border-hairline px-2.5 py-1 text-[12.5px] text-muted transition-colors duration-150 hover:text-ink cursor-pointer"
        >
          <Plus size={13} weight="bold" /> {addLabel}
        </button>
        <div className="mt-1 flex items-center gap-2">
          <SaveBtn
            saving={saving}
            onClick={async () => {
              const next = draft.map((x) => x.trim()).filter(Boolean);
              setSaving(true);
              await onSave(next);
              setSaving(false);
              setSaved(next);
              setEditing(false);
            }}
          />
          <CancelBtn onClick={() => { setDraft(saved); setEditing(false); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {variant === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {saved.map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-btn bg-accent-wash px-2.5 py-0.5 text-[12px] font-medium text-accent-deep">
              {t}
            </span>
          ))}
          {saved.length === 0 && <span className="text-[13px] text-faint">No topics</span>}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5 text-[14px] text-ink-soft">
          {saved.map((d, i) => (
            <li key={i} className="flex flex-col gap-1.5">
              <span className="flex gap-2">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                {d}
              </span>
              {traces?.[i] != null && onSeek && (
                <button
                  onClick={() => onSeek(traces[i]!)}
                  className="ml-4 inline-flex w-fit items-center gap-1 rounded-pill border border-lock/30 px-2 py-0.5 font-mono text-[11px] text-lock hover:bg-lock-wash cursor-pointer"
                >
                  <ArrowElbowDownRight size={11} weight="bold" /> {fmtMs(traces[i]!)}
                </button>
              )}
            </li>
          ))}
          {saved.length === 0 && <li className="text-[13px] text-faint">None recorded</li>}
        </ul>
      )}
      {canEdit && <EditBtn onClick={() => { setDraft(saved); setEditing(true); }} />}
    </div>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Edit"
      className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-input text-faint opacity-0 transition-opacity duration-150 hover:bg-panel-lift hover:text-ink group-hover:opacity-100 cursor-pointer"
    >
      <PencilSimple size={14} />
    </button>
  );
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-accent px-3 text-[13px] font-semibold text-accent-ink transition-transform duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      <Check size={14} weight="bold" /> {saving ? "Saving…" : "Save"}
    </button>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-btn px-3 text-[13px] text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink cursor-pointer"
    >
      <X size={14} /> Cancel
    </button>
  );
}
