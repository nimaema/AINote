"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Export,
  FileArrowDown,
  Copy,
  GoogleLogo,
  MicrosoftTeamsLogo,
  CaretDown,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

type Result = { kind: "ok" | "err"; text: string; url?: string } | null;

export function ExportMenu({
  recordingId,
  connections,
}: {
  recordingId: string;
  connections: { google: boolean; teams: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function copyMarkdown() {
    setBusy("copy");
    try {
      const res = await fetch(`/api/recordings/${recordingId}/export/markdown`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setResult({ kind: "ok", text: "Copied notes to clipboard" });
    } catch {
      setResult({ kind: "err", text: "Couldn't copy" });
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  async function exportTo(target: "google_docs" | "teams", label: string) {
    setBusy(target);
    setResult(null);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");
      setResult({
        kind: "ok",
        text: target === "google_docs" ? "Created a Google Doc" : `Sent to ${label}`,
        url: data.url,
      });
    } catch (e) {
      setResult({ kind: "err", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass inline-flex h-10 items-center gap-2 rounded-btn px-4 text-[14px] font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] cursor-pointer"
      >
        <Export size={16} />
        Export
        <CaretDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="glass absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-card p-1.5">
            <MenuItem
              icon={<FileArrowDown size={17} />}
              label="Download Markdown"
              onClick={() => {
                window.location.href = `/api/recordings/${recordingId}/export/markdown`;
                setOpen(false);
              }}
            />
            <MenuItem
              icon={<Copy size={17} />}
              label="Copy to clipboard"
              busy={busy === "copy"}
              onClick={copyMarkdown}
            />
            <div className="my-1.5 h-px bg-hairline" />
            {connections.google ? (
              <MenuItem
                icon={<GoogleLogo size={17} weight="bold" />}
                label="Send to Google Docs"
                busy={busy === "google_docs"}
                onClick={() => exportTo("google_docs", "Google Docs")}
              />
            ) : (
              <ConnectItem icon={<GoogleLogo size={17} weight="bold" />} label="Google Docs" />
            )}
            {connections.teams ? (
              <MenuItem
                icon={<MicrosoftTeamsLogo size={17} />}
                label="Send to Teams"
                busy={busy === "teams"}
                onClick={() => exportTo("teams", "Teams")}
              />
            ) : (
              <ConnectItem icon={<MicrosoftTeamsLogo size={17} />} label="Microsoft Teams" />
            )}
          </div>
        </>
      )}

      {result && (
        <div
          className={`glass absolute right-0 top-full z-40 mt-2 flex w-64 items-start gap-2 rounded-card px-3.5 py-3 text-[13px] ${
            result.kind === "ok" ? "text-ink-soft" : "text-err"
          }`}
        >
          {result.kind === "ok" ? (
            <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-ok" />
          ) : (
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p>{result.text}</p>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 font-medium text-accent-deep hover:underline"
              >
                Open <ArrowSquareOut size={12} />
              </a>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            className="ml-auto shrink-0 text-faint hover:text-ink cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-white/70 disabled:opacity-50 cursor-pointer"
    >
      <span className="text-accent-deep">{icon}</span>
      {busy ? "Working…" : label}
    </button>
  );
}

function ConnectItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Link
      href="/settings"
      className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-white/70 cursor-pointer"
    >
      <span className="text-faint">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="rounded-btn bg-accent-wash px-2 py-0.5 text-[11px] font-medium text-accent-deep">
        Connect
      </span>
    </Link>
  );
}
