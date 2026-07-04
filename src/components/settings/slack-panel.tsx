"use client";

import { useEffect, useState } from "react";
import { SlackLogo, CheckCircle, Trash } from "@phosphor-icons/react";

export function SlackPanel() {
  const [connected, setConnected] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/slack", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConnected(true);
        setUrl("");
      } else {
        setError(data.error ?? "Couldn't save that webhook.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/integrations/slack", { method: "DELETE" });
      setConnected(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass mt-5 rounded-panel p-6 sm:p-7">
      <div className="flex items-center gap-2.5 text-accent-deep">
        <SlackLogo size={18} weight="duotone" />
        <h2 className="text-[13.5px] font-semibold text-ink">Slack</h2>
        {connected && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-lock-wash px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-lock">
            <CheckCircle size={11} weight="fill" /> Connected
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Post a note&apos;s summary and action items to a Slack channel with one click from any recording.
      </p>

      {connected ? (
        <button
          onClick={disconnect}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-err transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
        >
          <Trash size={14} /> Disconnect Slack
        </button>
      ) : (
        <div className="mt-4">
          <label htmlFor="slack-url" className="text-[13px] font-medium text-ink-soft">
            Incoming webhook URL
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="slack-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/…"
              className="h-11 min-w-0 flex-1 rounded-input border border-hairline bg-bg px-3.5 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)]"
            />
            <button
              onClick={save}
              disabled={busy || !url.trim()}
              className="inline-flex h-11 items-center justify-center rounded-btn bg-accent px-5 text-[14px] font-semibold text-accent-ink transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Saving…" : "Connect"}
            </button>
          </div>
          {error && <p className="mt-2 text-[13px] text-err">{error}</p>}
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            In Slack: Apps → Incoming Webhooks → add to a channel → copy the webhook URL.
          </p>
        </div>
      )}
    </section>
  );
}
