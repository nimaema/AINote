"use client";

import { useState } from "react";
import { Check, Flag, UsersThree, UserPlus, X } from "@phosphor-icons/react";
import { useNoteAudio } from "@/components/note/note-audio";
import { UserPicker, type PickUser } from "@/components/team/user-picker";

export type Assignee = { id: string; name: string };

export type ActionRow = {
  id: string;
  task: string;
  ownerLabel: string | null;
  dueLabel: string | null;
  assignees: Assignee[];
  assignAll: boolean;
  status: "open" | "done";
  sourceMs: number | null;
};

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function ActionBoard({ actions, canManage }: { actions: ActionRow[]; canManage: boolean }) {
  const { seekTo } = useNoteAudio();
  const [rows, setRows] = useState<ActionRow[]>(actions);
  const [assignFor, setAssignFor] = useState<string | null>(null);

  function patch(id: string, body: Record<string, unknown>, optimistic: (r: ActionRow) => ActionRow) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? optimistic(r) : r)));
    fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) setRows(prev);
      })
      .catch(() => setRows(prev));
  }

  const toggle = (r: ActionRow) =>
    patch(r.id, { status: r.status === "done" ? "open" : "done" }, (x) => ({
      ...x,
      status: x.status === "done" ? "open" : "done",
    }));

  const addAssignee = (row: ActionRow, u: PickUser) => {
    if (row.assignees.some((a) => a.id === u.id)) return;
    const next = [...row.assignees, { id: u.id, name: u.name }];
    patch(row.id, { assigneeIds: next.map((a) => a.id), assignAll: false }, (x) => ({
      ...x,
      assignees: next,
      assignAll: false,
    }));
  };

  const removeAssignee = (row: ActionRow, uid: string) => {
    const next = row.assignees.filter((a) => a.id !== uid);
    patch(row.id, { assigneeIds: next.map((a) => a.id), assignAll: false }, (x) => ({
      ...x,
      assignees: next,
    }));
  };

  const assignTeam = (row: ActionRow) => {
    setAssignFor(null);
    patch(row.id, { assignAll: true, assigneeIds: [] }, (x) => ({ ...x, assignAll: true, assignees: [] }));
  };

  const clearTeam = (row: ActionRow) =>
    patch(row.id, { assignAll: false, assigneeIds: [] }, (x) => ({ ...x, assignAll: false }));

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {rows.map((a) => {
        const done = a.status === "done";
        const hasAssignment = a.assignAll || a.assignees.length > 0;
        return (
          <div key={a.id} className="relative rounded-card border border-hairline bg-bg p-3">
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => toggle(a)}
                aria-pressed={done}
                aria-label={done ? "Mark open" : "Mark done"}
                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                  done ? "border-lock bg-lock text-bg-2" : "border-hairline-strong hover:border-lock"
                }`}
              >
                {done && <Check size={12} weight="bold" />}
              </button>
              <p className={`text-[14px] leading-relaxed ${done ? "text-faint line-through" : "text-ink-soft"}`}>
                {a.task}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[26px]">
              {a.assignAll ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-wash py-0.5 pl-2 pr-2 text-[12px] font-medium text-accent-deep">
                  <UsersThree size={13} weight="fill" />
                  Whole team
                  {canManage && (
                    <button onClick={() => clearTeam(a)} aria-label="Clear team assignment" className="ml-0.5 text-accent-deep/70 hover:text-accent-deep cursor-pointer">
                      <X size={11} weight="bold" />
                    </button>
                  )}
                </span>
              ) : a.assignees.length > 0 ? (
                a.assignees.map((as) => (
                  <span key={as.id} className="inline-flex items-center gap-1.5 rounded-pill bg-accent-wash py-0.5 pl-0.5 pr-2 text-[12px] font-medium text-accent-deep">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] font-semibold text-accent-ink">
                      {as.name.charAt(0).toUpperCase()}
                    </span>
                    {as.name}
                    {canManage && (
                      <button onClick={() => removeAssignee(a, as.id)} aria-label={`Unassign ${as.name}`} className="ml-0.5 text-accent-deep/70 hover:text-accent-deep cursor-pointer">
                        <X size={11} weight="bold" />
                      </button>
                    )}
                  </span>
                ))
              ) : (
                a.ownerLabel && <Chip>{a.ownerLabel}</Chip>
              )}
              {a.dueLabel && <Chip muted>{a.dueLabel}</Chip>}

              {canManage && (
                <button
                  onClick={() => setAssignFor(assignFor === a.id ? null : a.id)}
                  className="inline-flex items-center gap-1 rounded-pill border border-hairline px-2 py-0.5 text-[11.5px] text-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink cursor-pointer"
                >
                  <UserPlus size={12} /> {hasAssignment ? "Edit" : "Assign"}
                </button>
              )}

              {a.sourceMs != null && (
                <button
                  onClick={() => seekTo(a.sourceMs!)}
                  className="inline-flex items-center gap-1 rounded-pill border border-lock/30 px-2 py-0.5 font-mono text-[11px] text-lock transition-colors duration-150 hover:border-lock/60 hover:bg-lock-wash cursor-pointer"
                  title="Play the moment this came from"
                >
                  <Flag size={11} weight="bold" />
                  {fmtMs(a.sourceMs)}
                </button>
              )}
            </div>

            {assignFor === a.id && (
              <div className="glass-menu pop-in absolute left-3 right-3 top-full z-40 mt-1 rounded-card p-2">
                <button
                  onClick={() => assignTeam(a)}
                  className="mb-1.5 flex w-full items-center gap-2 rounded-[8px] border border-hairline px-2.5 py-2 text-left text-[13px] font-medium text-accent-deep transition-colors duration-150 hover:bg-accent-wash cursor-pointer"
                >
                  <UsersThree size={16} weight="fill" /> Assign to the whole team
                </button>
                <UserPicker
                  autoFocus
                  onPick={(u) => addAssignee(a, u)}
                  exclude={a.assignees.map((as) => as.id)}
                  placeholder="Add a teammate…"
                />
                <div className="mt-1.5 flex justify-end">
                  <button
                    onClick={() => setAssignFor(null)}
                    className="rounded-[8px] px-2.5 py-1 text-[12.5px] font-medium text-muted hover:bg-panel-lift hover:text-ink cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-[12px] font-medium ${
        muted ? "bg-panel text-muted" : "bg-accent-wash text-accent-deep"
      }`}
    >
      {children}
    </span>
  );
}
