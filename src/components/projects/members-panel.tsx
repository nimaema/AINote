"use client";

import { useEffect, useState } from "react";
import { UsersThree, Plus, X } from "@phosphor-icons/react";
import { UserPicker, type PickUser } from "@/components/team/user-picker";

type Member = { userId: string; name: string; email: string | null; role: "owner" | "editor" | "viewer" };

export function MembersPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, { cache: "no-store" });
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function add(u: PickUser) {
    setAdding(false);
    setBusy(true);
    await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role: "editor" }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }

  async function remove(userId: string) {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
    await load();
    setBusy(false);
  }

  return (
    <section className="rounded-[18px] border border-hairline bg-panel-solid p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-accent-deep">
          <UsersThree size={17} weight="duotone" />
          <h2 className="text-[13.5px] font-semibold text-ink">Members</h2>
          <span className="rounded-[7px] bg-bg px-2 py-0.5 font-mono text-[10.5px] text-faint">{members.length}</span>
        </div>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-btn px-2.5 text-[12px] font-medium text-muted transition-colors duration-150 hover:bg-panel-lift hover:text-ink cursor-pointer"
          >
            <Plus size={13} weight="bold" /> Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 rounded-[14px] border border-hairline bg-bg p-2.5">
          <UserPicker autoFocus onPick={add} exclude={members.map((m) => m.userId)} placeholder="Add a teammate" />
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-1.5">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-2.5 rounded-[12px] border border-hairline bg-bg px-2.5 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-ink">
              {m.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{m.name}</p>
              {m.email && <p className="truncate text-[11px] text-faint">{m.email}</p>}
            </div>
            <span className="rounded-pill bg-panel px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {m.role}
            </span>
            {canManage && m.role !== "owner" && (
              <button
                onClick={() => remove(m.userId)}
                disabled={busy}
                aria-label={`Remove ${m.name}`}
                className="grid h-7 w-7 place-items-center rounded-input text-faint transition-colors duration-150 hover:bg-panel-lift hover:text-err disabled:opacity-50 cursor-pointer"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
