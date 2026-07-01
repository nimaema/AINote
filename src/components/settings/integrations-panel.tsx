"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleLogo,
  Chats,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export function IntegrationsPanel({
  google,
  teams,
}: {
  google: { configured: boolean; connected: boolean; email?: string | null };
  teams: { connected: boolean };
}) {
  const router = useRouter();
  const [webhook, setWebhook] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function disconnect(provider: "google" | "teams") {
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveTeams(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhook.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      setWebhook("");
      setMsg({ kind: "ok", text: "Teams webhook saved" });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Google Docs */}
      <section className="glass rounded-panel p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
            <GoogleLogo size={20} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[16px] font-bold text-ink">Google Docs</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Send a note straight to a new Google Doc in your Drive.
            </p>

            <div className="mt-4">
              {!google.configured ? (
                <p className="rounded-input border border-hairline bg-white/50 px-3.5 py-2.5 text-[13px] text-muted">
                  Google export isn&apos;t set up on this server. Ask your admin to
                  add <code className="font-mono text-[12px]">GOOGLE_CLIENT_ID</code>.
                </p>
              ) : google.connected ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <CheckCircle size={16} weight="fill" className="text-ok" />
                    Connected{google.email ? ` as ${google.email}` : ""}
                  </span>
                  <button
                    onClick={() => disconnect("google")}
                    className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  href="/api/connect/google"
                  className="inline-flex h-10 items-center gap-2 rounded-btn bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] cursor-pointer"
                >
                  <GoogleLogo size={16} weight="bold" /> Connect Google
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Microsoft Teams */}
      <section className="glass rounded-panel p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
            <Chats size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[16px] font-bold text-ink">Microsoft Teams</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Post notes to a Teams channel with an incoming webhook (Workflows).
            </p>

            <div className="mt-4">
              {teams.connected ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <CheckCircle size={16} weight="fill" className="text-ok" />
                    Webhook configured
                  </span>
                  <button
                    onClick={() => disconnect("teams")}
                    className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={saveTeams} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={webhook}
                    onChange={(e) => setWebhook(e.target.value)}
                    placeholder="https://…webhook.office.com/…"
                    className="h-10 flex-1 rounded-input border border-hairline bg-white/70 px-3.5 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
                  />
                  <button
                    type="submit"
                    disabled={saving || !webhook.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-btn bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </form>
              )}
              {msg && (
                <p
                  className={`mt-2.5 flex items-center gap-1.5 text-[13px] ${
                    msg.kind === "ok" ? "text-ok" : "text-err"
                  }`}
                >
                  {msg.kind === "ok" ? (
                    <CheckCircle size={15} weight="fill" />
                  ) : (
                    <WarningCircle size={15} weight="fill" />
                  )}
                  {msg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
