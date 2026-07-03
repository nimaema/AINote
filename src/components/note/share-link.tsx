"use client";

import { useEffect, useRef, useState } from "react";
import { LinkSimple, Copy, Check, Trash, CaretDown } from "@phosphor-icons/react";

// Owner control for a public, read-only external link (no sign-in required).
export function ShareLink({
  recordingId,
  initialToken,
}: {
  recordingId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}` : "";

  async function create() {
    setBusy(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/share`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setToken(data.token);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      await fetch(`/api/recordings/${recordingId}/share`, { method: "DELETE" });
      setToken(null);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-10 items-center gap-2 rounded-btn px-3.5 text-[13px] font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer ${
          token ? "bg-lock-wash text-lock" : "glass text-ink-soft"
        }`}
        title="Public read-only link"
      >
        <LinkSimple size={16} weight="bold" />
        {token ? "Link on" : "Share link"}
        <CaretDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 w-80 rounded-card p-3">
          <p className="text-[12.5px] font-semibold text-ink">Public read-only link</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Anyone with this link can read the notes and transcript — no sign-in. It doesn&apos;t expose the audio.
          </p>

          {token ? (
            <>
              <div className="mt-3 flex items-center gap-1.5">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 min-w-0 flex-1 rounded-input border border-hairline bg-bg px-2.5 font-mono text-[11.5px] text-ink-soft focus:outline-none"
                />
                <button
                  onClick={copy}
                  aria-label="Copy link"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-accent text-accent-ink transition-transform duration-150 active:scale-95 cursor-pointer"
                >
                  {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
                </button>
              </div>
              <button
                onClick={revoke}
                disabled={busy}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-err transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
              >
                <Trash size={13} /> Revoke link
              </button>
            </>
          ) : (
            <button
              onClick={create}
              disabled={busy}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-btn bg-accent px-3.5 text-[13px] font-semibold text-accent-ink transition-transform duration-150 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <LinkSimple size={14} weight="bold" /> {busy ? "Creating…" : "Create link"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
