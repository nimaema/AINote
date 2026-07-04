"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pulse, WarningCircle } from "@phosphor-icons/react";

type Snapshot = {
  counts: Record<string, number>;
  failed: { id: string | null; name: string; recordingId: string | null; reason: string }[];
};

const TILES: { key: string; label: string; tone?: "accent" | "err" }[] = [
  { key: "active", label: "Active", tone: "accent" },
  { key: "waiting", label: "Waiting" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed", tone: "err" },
];

export function QueueHealth() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't reach the queue.");
        return;
      }
      setError(null);
      setSnap(data);
    } catch {
      setError("Couldn't reach the queue.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="glass mb-5 rounded-panel p-4 sm:p-5">
      <div className="flex items-center gap-2 text-accent-deep">
        <Pulse size={17} weight="duotone" />
        <h2 className="text-[13.5px] font-semibold text-ink">Processing queue</h2>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
          <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-err" : "bg-ok animate-pulse"}`} />
          {error ? "Down" : "Live"}
        </span>
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-err">
          <WarningCircle size={15} weight="fill" /> {error}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TILES.map((t) => {
              const v = snap?.counts?.[t.key] ?? 0;
              return (
                <div key={t.key} className="rounded-[12px] border border-hairline bg-bg px-3.5 py-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{t.label}</p>
                  <p
                    className={`tabular mt-1 text-[22px] font-semibold ${
                      t.tone === "err" && v > 0 ? "text-err" : t.tone === "accent" && v > 0 ? "text-accent-deep" : "text-ink"
                    }`}
                  >
                    {v}
                  </p>
                </div>
              );
            })}
          </div>

          {snap && snap.failed.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Recent failures</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {snap.failed.map((f) => (
                  <li
                    key={f.id ?? Math.random()}
                    className="flex items-start gap-2 rounded-[10px] border border-hairline bg-bg px-3 py-2"
                  >
                    <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-err" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-ink-soft">{f.reason || "Unknown error"}</p>
                      <p className="font-mono text-[10.5px] text-faint">
                        {f.name}
                        {f.recordingId && (
                          <>
                            {" · "}
                            <Link href={`/note/${f.recordingId}`} className="hover:text-accent-deep">
                              {f.recordingId.slice(0, 8)}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
