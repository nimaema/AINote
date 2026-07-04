"use client";

import { useRef, useState } from "react";
import {
  Export,
  FilePdf,
  MarkdownLogo,
  Copy,
  WaveSawtooth,
  CaretDown,
  CheckCircle,
  SlackLogo,
} from "@phosphor-icons/react";
import { DropMenu } from "@/components/ui/drop-menu";

export function ExportMenu({ recordingId }: { recordingId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  async function sendSlack() {
    setSending(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/export/slack`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Couldn't send to Slack.");
      }
    } finally {
      setSending(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="glass inline-flex h-10 items-center gap-2 rounded-btn px-4 text-[14px] font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer"
      >
        {copied ? <CheckCircle size={16} weight="fill" className="text-ok" /> : <Export size={16} />}
        {copied ? "Copied" : "Export"}
        <CaretDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <DropMenu open={open} onClose={() => setOpen(false)} anchor={btnRef} align="end" width={240}>
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
          icon={<SlackLogo size={17} weight="duotone" />}
          label={sending ? "Sending…" : "Send to Slack"}
          onClick={sendSlack}
        />
        <MenuItem
          icon={<WaveSawtooth size={17} weight="duotone" />}
          label="Download audio"
          onClick={() => download(`/api/recordings/${recordingId}/audio?download=1`)}
        />
      </DropMenu>
    </>
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
