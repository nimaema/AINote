"use client";

import { useState } from "react";
import { Lock, Eye, EyeSlash, CheckCircle } from "@phosphor-icons/react";
import { changeOwnPassword } from "@/app/settings/actions";

export function AccountPanel({
  email,
  role,
}: {
  email: string;
  role: "admin" | "member";
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await changeOwnPassword({ current, next, confirm });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      setError(res.error ?? "Couldn't update your password.");
    }
  }

  const canSubmit = current && next.length >= 8 && confirm && !busy;

  return (
    <section className="glass rounded-panel p-6 sm:p-7">
      <div className="flex items-center gap-2.5 text-accent-deep">
        <Lock size={17} weight="duotone" />
        <h2 className="text-[13.5px] font-semibold text-ink">Password</h2>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Change the password you use to sign in to {email}.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <Field label="Current password" htmlFor="current">
          <PasswordInput
            id="current"
            value={current}
            show={show}
            onChange={setCurrent}
            autoComplete="current-password"
            placeholder="Your current password"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="next" hint="At least 8 characters">
            <PasswordInput
              id="next"
              value={next}
              show={show}
              onChange={setNext}
              autoComplete="new-password"
              placeholder="New password"
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm">
            <PasswordInput
              id="confirm"
              value={confirm}
              show={show}
              onChange={setConfirm}
              autoComplete="new-password"
              placeholder="Repeat new password"
            />
          </Field>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 text-[12.5px] text-muted select-none">
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-ink-soft transition-colors duration-150 hover:bg-panel-lift cursor-pointer"
          >
            {show ? <EyeSlash size={15} /> : <Eye size={15} />}
            {show ? "Hide passwords" : "Show passwords"}
          </button>
        </label>

        {error && (
          <p role="alert" className="rounded-input bg-[rgba(229,72,77,0.1)] px-3.5 py-2.5 text-[13px] text-err">
            {error}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-2 rounded-input bg-[rgba(14,164,114,0.1)] px-3.5 py-2.5 text-[13px] text-ok">
            <CheckCircle size={16} weight="fill" /> Password updated.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-btn bg-accent px-5 text-[14px] font-semibold text-accent-ink shadow-[0_10px_24px_-14px_rgba(214,70,31,0.7)] transition-[transform,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
          <span className="rounded-btn bg-panel px-2.5 py-1 font-mono text-[11px] text-muted">
            {role}
          </span>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-ink-soft">
        {label}
        {hint && <span className="text-[11.5px] font-normal text-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <input
      id={id}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="h-11 w-full rounded-input border border-hairline bg-bg px-3.5 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
    />
  );
}
