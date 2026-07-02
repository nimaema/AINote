"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Key,
  Trash,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Copy,
} from "@phosphor-icons/react";
import {
  createUser,
  setActive,
  setRole,
  resetPassword,
  deleteUser,
} from "@/app/admin/users/actions";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "member";
  active: boolean;
  recordings: number;
  timeLabel: string;
  storageLabel: string;
  lastActiveLabel: string;
};

type Flash = { kind: "ok" | "err"; text: string; secret?: string } | null;

export function UsersAdmin({ users, meId }: { users: UserRow[]; meId: string }) {
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<Flash>(null);

  // add-user form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleState] = useState<"admin" | "member">("member");
  const [password, setPassword] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string; tempPassword?: string }>, okText: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setFlash({ kind: "err", text: res.error ?? "Something went wrong" });
      else setFlash({ kind: "ok", text: okText, secret: res.tempPassword });
    });
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const eml = email.trim();
    if (!eml) return;
    run(
      () => createUser({ name: name.trim() || undefined, email: eml, role, password: password.trim() || undefined }),
      `Added ${eml}`
    );
    setName("");
    setEmail("");
    setPassword("");
    setRoleState("member");
  }

  const input =
    "h-11 rounded-input border border-hairline bg-white/70 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]";

  return (
    <div className="space-y-6">
      {/* Add user */}
      <section className="glass rounded-panel p-6">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          <UserPlus size={17} className="text-accent-deep" /> Add a user
        </h2>
        <form onSubmit={onAdd} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input className={input} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="email" required placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select
            className={input}
            value={role}
            onChange={(e) => setRoleState(e.target.value as "admin" | "member")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-btn bg-ink px-5 text-[14px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <UserPlus size={16} /> Add
          </button>
        </form>
        <div className="mt-3 sm:max-w-xs">
          <input
            className={`${input} w-full`}
            type="text"
            placeholder="Initial password (blank = generate)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </section>

      {flash && (
        <div
          className={`glass flex items-start gap-2.5 rounded-card px-4 py-3 text-[13.5px] ${
            flash.kind === "ok" ? "text-ink-soft" : "text-err"
          }`}
        >
          {flash.kind === "ok" ? (
            <CheckCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-ok" />
          ) : (
            <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p>{flash.text}</p>
            {flash.secret && (
              <div className="mt-1.5 flex items-center gap-2">
                <code className="rounded-input bg-white/70 px-2 py-1 font-mono text-[13px] text-ink">
                  {flash.secret}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(flash.secret!)}
                  className="inline-flex items-center gap-1 text-[12.5px] text-accent-deep hover:underline cursor-pointer"
                >
                  <Copy size={13} /> Copy
                </button>
                <span className="text-[12px] text-faint">Share once, then have them change it.</span>
              </div>
            )}
          </div>
          <button onClick={() => setFlash(null)} className="shrink-0 text-faint hover:text-ink cursor-pointer" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* User list */}
      <section className="glass-soft overflow-hidden rounded-panel">
        <ul className="divide-y divide-hairline">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14.5px] font-medium text-ink">
                    {u.name || u.email}
                  </span>
                  {u.role === "admin" && (
                    <span className="inline-flex items-center gap-1 rounded-btn bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent-deep">
                      <ShieldCheck size={12} weight="fill" /> Admin
                    </span>
                  )}
                  {!u.active && (
                    <span className="rounded-btn bg-[rgba(20,22,28,0.06)] px-2 py-0.5 text-[11px] font-medium text-muted">
                      Inactive
                    </span>
                  )}
                  {u.id === meId && (
                    <span className="text-[11px] text-faint">you</span>
                  )}
                </div>
                {u.name && <p className="truncate text-[12.5px] text-muted">{u.email}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-faint">
                  <span>{u.recordings} rec</span>
                  <span>·</span>
                  <span>{u.timeLabel}</span>
                  <span>·</span>
                  <span>{u.storageLabel}</span>
                  <span>·</span>
                  <span>active {u.lastActiveLabel}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <RowBtn
                  onClick={() => run(() => setRole(u.id, u.role === "admin" ? "member" : "admin"), "Role updated")}
                  disabled={pending || u.id === meId}
                >
                  {u.role === "admin" ? "Make member" : "Make admin"}
                </RowBtn>
                <RowBtn
                  onClick={() => run(() => setActive(u.id, !u.active), u.active ? "Deactivated" : "Activated")}
                  disabled={pending || u.id === meId}
                >
                  {u.active ? "Deactivate" : "Activate"}
                </RowBtn>
                <RowBtn
                  onClick={() => run(() => resetPassword(u.id), "New temporary password")}
                  disabled={pending}
                  icon={<Key size={14} />}
                >
                  Reset
                </RowBtn>
                <RowBtn
                  onClick={() => {
                    if (confirm(`Remove ${u.email}? This deletes their recordings too.`))
                      run(() => deleteUser(u.id), "User removed");
                  }}
                  disabled={pending || u.id === meId}
                  danger
                  icon={<Trash size={14} />}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RowBtn({
  children,
  onClick,
  disabled,
  danger,
  icon,
}: {
  children?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1.5 rounded-btn border px-3 text-[12.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] disabled:opacity-40 cursor-pointer ${
        danger
          ? "border-hairline text-err hover:bg-[rgba(229,72,77,0.08)]"
          : "border-hairline text-ink-soft hover:bg-white/70"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
