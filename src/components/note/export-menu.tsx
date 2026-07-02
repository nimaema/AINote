"use client";

import { useEffect, useRef, useState } from "react";
import {
  Export,
  FilePdf,
  MarkdownLogo,
  Copy,
  WaveSawtooth,
  CaretDown,
  CheckCircle,
} from "@phosphor-icons/react";

export function ExportMenu({ recordingId }: { recordingId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function download(path: string) {
    window.location.href = path;
    setOpen(false);
  }

  async function copyMarkdown() {
    setCopying(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/export/markdown`);
      await navigator.clipboard.writeText(await res.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied, silently ignore */
    } finally {
      setCopying(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass inline-flex h-10 items-center gap-2 rounded-btn px-4 text-[14px] font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer"
      >
        {copied ? <CheckCircle size={16} weight="fill" className="text-ok" /> : <Export size={16} />}
        {copied ? "Copied" : "Export"}
        <CaretDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="glass-menu pop-in absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-card p-1.5"
          >
            <MenuItem
              icon={<FilePdf size={18} weight="duotone" />}
              label="Download PDF"
              hint="Designed"
              onClick={() => download(`/api/recordings/${recordingId}/export/pdf`)}
            />
            <MenuItem
              icon={<MarkdownLogo size={18} weight="duotone" />}
              label="Download Markdown"
              onClick={() => download(`/api/recordings/${recordingId}/export/markdown`)}
            />
            <MenuItem
              icon={<Copy size={17} />}
              label={copying ? "Copying…" : "Copy to clipboard"}
              onClick={copyMarkdown}
            />
            <div className="my-1.5 h-px bg-hairline" />
            <MenuItem
              icon={<WaveSawtooth size={17} weight="duotone" />}
              label="Download audio"
              onClick={() => download(`/api/recordings/${recordingId}/audio?download=1`)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-input px-3 py-2.5 text-left text-[14px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift cursor-pointer"
    >
      <span className="text-accent-deep">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="rounded-btn bg-accent-wash px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-accent-deep">
          {hint}
        </span>
      )}
    </button>
  );
}
