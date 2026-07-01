"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleLogo,
  MicrosoftTeamsLogo,
  CheckCircle,
  CaretRight,
  ArrowLeft,
} from "@phosphor-icons/react";

type TeamsProps = {
  configured: boolean;
  connected: boolean;
  account?: string | null;
  teamName?: string | null;
  channelName?: string | null;
};

export function IntegrationsPanel({
  google,
  teams,
}: {
  google: { configured: boolean; connected: boolean; email?: string | null };
  teams: TeamsProps;
}) {
  const router = useRouter();
  const disconnect = async (provider: "google" | "teams") => {
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    router.refresh();
  };

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
            <p className="mt-0.5 text-[13px] text-muted">Send a note straight to a new Google Doc in your Drive.</p>
            <div className="mt-4">
              {!google.configured ? (
                <NotConfigured varName="GOOGLE_CLIENT_ID" what="Google" />
              ) : google.connected ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Connected label={`Connected${google.email ? ` as ${google.email}` : ""}`} />
                  <DisconnectBtn onClick={() => disconnect("google")} />
                </div>
              ) : (
                <a href="/api/connect/google" className={connectBtn}>
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
            <MicrosoftTeamsLogo size={20} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[16px] font-bold text-ink">Microsoft Teams</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Upload the transcript as a file to a channel and post the summary.
            </p>
            <div className="mt-4">
              {!teams.configured ? (
                <NotConfigured varName="MS_CLIENT_ID" what="Teams" />
              ) : !teams.connected ? (
                <a href="/api/connect/microsoft" className={connectBtn}>
                  <MicrosoftTeamsLogo size={16} weight="fill" /> Connect Microsoft
                </a>
              ) : (
                <TeamsConnected teams={teams} onDisconnect={() => disconnect("teams")} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TeamsConnected({ teams, onDisconnect }: { teams: TeamsProps; onDisconnect: () => void }) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Connected label={`Connected${teams.account ? ` as ${teams.account}` : ""}`} />
        <DisconnectBtn onClick={onDisconnect} />
      </div>

      {teams.channelName ? (
        <div className="flex flex-wrap items-center gap-2 rounded-input border border-hairline bg-white/50 px-3.5 py-2.5 text-[13px]">
          <span className="text-muted">Posting to</span>
          <span className="font-medium text-ink">
            {teams.teamName} · {teams.channelName}
          </span>
          {!picking && (
            <button onClick={() => setPicking(true)} className="ml-auto text-[12.5px] text-accent-deep hover:underline cursor-pointer">
              Change
            </button>
          )}
        </div>
      ) : (
        !picking && (
          <button onClick={() => setPicking(true)} className={connectBtn}>
            Choose a channel <CaretRight size={14} />
          </button>
        )
      )}

      {picking && (
        <ChannelPicker
          onDone={() => {
            setPicking(false);
            router.refresh();
          }}
          onCancel={() => setPicking(false)}
        />
      )}
    </div>
  );
}

type Item = { id: string; name: string };

function ChannelPicker({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [teams, setTeams] = useState<Item[] | null>(null);
  const [team, setTeam] = useState<Item | null>(null);
  const [channels, setChannels] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await (await fetch("/api/integrations/microsoft/teams")).json();
        if (d.error) throw new Error(d.error);
        if (!cancelled) setTeams((d.teams as { id: string; displayName: string }[]).map((t) => ({ id: t.id, name: t.displayName })));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Couldn't load teams");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function pickTeam(t: Item) {
    setTeam(t);
    setLoading(true);
    setChannels(null);
    setErr(null);
    try {
      const d = await (await fetch(`/api/integrations/microsoft/channels?teamId=${t.id}`)).json();
      if (d.error) throw new Error(d.error);
      setChannels((d.channels as { id: string; displayName: string }[]).map((c) => ({ id: c.id, name: c.displayName })));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load channels");
    } finally {
      setLoading(false);
    }
  }

  async function pickChannel(c: Item) {
    if (!team) return;
    await fetch("/api/integrations/microsoft/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id, channelId: c.id, teamName: team.name, channelName: c.name }),
    });
    onDone();
  }

  const items = (team ? channels : teams) ?? [];

  return (
    <div className="rounded-card border border-hairline bg-white/60 p-2">
      <div className="mb-1 flex items-center gap-2 px-1.5 py-1 text-[12.5px] text-muted">
        {team ? (
          <button onClick={() => { setTeam(null); setChannels(null); }} className="inline-flex items-center gap-1 hover:text-ink cursor-pointer">
            <ArrowLeft size={13} /> {team.name}
          </button>
        ) : (
          <span>Choose a team</span>
        )}
        <button onClick={onCancel} className="ml-auto hover:text-ink cursor-pointer">
          Cancel
        </button>
      </div>

      {err ? (
        <p className="px-2 py-3 text-[13px] text-err">{err}</p>
      ) : loading ? (
        <p className="px-2 py-3 text-[13px] text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-2 py-3 text-[13px] text-muted">Nothing found.</p>
      ) : (
        <ul className="max-h-56 overflow-y-auto">
          {items.map((x) => (
            <li key={x.id}>
              <button
                onClick={() => (team ? pickChannel(x) : pickTeam(x))}
                className="flex w-full items-center justify-between rounded-input px-2.5 py-2 text-left text-[13.5px] text-ink-soft transition-colors duration-150 hover:bg-white cursor-pointer"
              >
                {x.name}
                {!team && <CaretRight size={14} className="text-faint" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const connectBtn =
  "inline-flex h-10 items-center gap-2 rounded-btn bg-ink px-4 text-[14px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] cursor-pointer";

function Connected({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
      <CheckCircle size={16} weight="fill" className="text-ok" />
      {label}
    </span>
  );
}

function DisconnectBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline cursor-pointer">
      Disconnect
    </button>
  );
}

function NotConfigured({ varName, what }: { varName: string; what: string }) {
  return (
    <p className="rounded-input border border-hairline bg-white/50 px-3.5 py-2.5 text-[13px] text-muted">
      {what} export isn&apos;t set up on this server. Ask your admin to add{" "}
      <code className="font-mono text-[12px]">{varName}</code>.
    </p>
  );
}
