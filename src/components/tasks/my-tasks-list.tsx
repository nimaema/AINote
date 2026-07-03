"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowElbowDownRight, WaveSawtooth } from "@phosphor-icons/react";

export type TaskItem = {
  id: string;
  task: string;
  status: "open" | "done";
  dueLabel: string | null;
  sourceMs: number | null;
  recordingId: string;
  recTitle: string;
  dateLabel: string;
};

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function MyTasksList({ items }: { items: TaskItem[] }) {
  const [rows, setRows] = useState<TaskItem[]>(items);

  function toggle(t: TaskItem) {
    const next = t.status === "done" ? "open" : "done";
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, status: next } : r)));
    fetch(`/api/actions/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
      .then((res) => {
        if (!res.ok) setRows(prev);
      })
      .catch(() => setRows(prev));
  }

  const open = rows.filter((r) => r.status === "open");
  const done = rows.filter((r) => r.status === "done");

  if (rows.length === 0) {
    return (
      <div className="glass grid place-items-center rounded-panel px-6 py-16 text-center">
        <WaveSawtooth size={26} className="text-faint" />
        <p className="mt-3 text-[14px] font-semibold text-ink">Nothing assigned to you</p>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
          When a teammate assigns you an action item, it lands here as a single worklist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Group title="Open" count={open.length}>
        {open.map((t) => (
          <Row key={t.id} t={t} onToggle={() => toggle(t)} />
        ))}
        {open.length === 0 && <p className="px-1 py-3 text-[13px] text-muted">All clear — nothing open.</p>}
      </Group>
      {done.length > 0 && (
        <Group title="Done" count={done.length}>
          {done.map((t) => (
            <Row key={t.id} t={t} onToggle={() => toggle(t)} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="glass rounded-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        <span className="tabular font-mono text-[11.5px] text-faint">{count}</span>
      </div>
      <div className="divide-y divide-hairline">{children}</div>
    </section>
  );
}

function Row({ t, onToggle }: { t: TaskItem; onToggle: () => void }) {
  const done = t.status === "done";
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? "Mark open" : "Mark done"}
        className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
          done ? "border-lock bg-lock text-bg-2" : "border-hairline-strong hover:border-lock"
        }`}
      >
        {done && <Check size={12} weight="bold" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] leading-relaxed ${done ? "text-faint line-through" : "text-ink-soft"}`}>{t.task}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-faint">
          <Link href={`/note/${t.recordingId}`} className="text-ink-soft hover:text-accent-deep">
            {t.recTitle}
          </Link>
          <span>{t.dateLabel}</span>
          {t.dueLabel && <span className="text-warn">due {t.dueLabel}</span>}
          {t.sourceMs != null && (
            <Link
              href={`/note/${t.recordingId}`}
              className="inline-flex items-center gap-1 rounded-pill border border-lock/30 px-1.5 py-0.5 text-lock hover:bg-lock-wash"
            >
              <ArrowElbowDownRight size={10} weight="bold" /> {fmtMs(t.sourceMs)}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
