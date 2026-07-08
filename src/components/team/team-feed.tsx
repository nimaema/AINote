"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  WaveSawtooth,
  ListChecks,
  Translate,
  ShareNetwork,
} from "@phosphor-icons/react";

export type TeamItem = {
  id: string;
  title: string;
  status: string;
  dateLabel: string;
  durationLabel: string;
  summary: string | null;
  topics: string[];
  language: string | null;
  actionCount: number;
  authorId: string;
  authorName: string;
  isMine: boolean;
};

export type TeamStats = {
  shared: number;
  contributors: number;
  totalTimeLabel: string;
  openActions: number;
};

const CONTRIB_COLORS = [
  "var(--color-accent)",
  "var(--color-aurora-violet)",
  "var(--color-aurora-teal)",
  "var(--color-aurora-rose)",
  "var(--color-warn)",
  "var(--color-aurora-amber)",
];

const STATUS: Record<string, { label: string; dot: string; text: string; note: string }> = {
  uploaded: { label: "Queued", dot: "bg-faint", text: "text-muted", note: "Queued for transcription..." },
  transcribing: { label: "Transcribing", dot: "bg-accent", text: "text-accent-deep", note: "Transcribing the audio..." },
  processing: { label: "Summarizing", dot: "bg-accent", text: "text-accent-deep", note: "Writing the summary..." },
  done: { label: "Ready", dot: "bg-ok", text: "text-ok", note: "" },
  failed: { label: "Failed", dot: "bg-err", text: "text-err", note: "Processing failed." },
};

function initialOf(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}

export function TeamFeed({
  items,
  stats,
  userName,
}: {
  items: TeamItem[];
  stats: TeamStats;
  userName: string;
}) {
  const [q, setQ] = useState("");
  const [author, setAuthor] = useState<string>("all");

  // Distinct contributors, in first-seen order, each assigned a stable color.
  const contributors = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string }>();
    items.forEach((it) => {
      if (!seen.has(it.authorId)) {
        seen.set(it.authorId, {
          id: it.authorId,
          name: it.authorName,
          color: CONTRIB_COLORS[seen.size % CONTRIB_COLORS.length],
        });
      }
    });
    return [...seen.values()];
  }, [items]);

  const colorFor = (id: string) =>
    contributors.find((c) => c.id === id)?.color ?? CONTRIB_COLORS[0];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((r) => {
      if (author !== "all" && r.authorId !== author) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        (r.summary ?? "").toLowerCase().includes(needle) ||
        r.authorName.toLowerCase().includes(needle) ||
        r.topics.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [items, q, author]);

  return (
    <main className="mx-auto max-w-[1540px] px-3 pb-28 pt-3 sm:px-5 md:px-7 md:pb-12 md:pt-5">
      <section className="workbench-hero overflow-hidden rounded-[18px] border border-hairline p-5 sm:p-6 lg:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Workspace · shared signal</p>
        <h1 className="mt-2.5 max-w-3xl font-display text-[24px] font-normal leading-[1.08] text-ink sm:text-[32px] lg:text-[36px]">
          What the team is capturing.
        </h1>
        <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted">
          Every recording shared to the workspace, {userName}. Open any one to
          read the notes and trace them back to the moment they were said.
        </p>

        <div className="mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Shared captures" value={String(stats.shared)} />
          <Metric label="Contributors" value={String(stats.contributors)} />
          <Metric label="Shared time" value={stats.totalTimeLabel} />
          <Metric label="Open actions" value={String(stats.openActions)} />
        </div>
      </section>

      <section className="glass mt-5 rounded-panel">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-4 py-2.5">
          <h2 className="text-[14px] font-semibold text-ink">
            Shared feed
            <span className="tabular ml-2 font-mono text-[11.5px] font-normal text-faint">{filtered.length}</span>
          </h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search shared"
                className="h-8 w-36 min-w-0 rounded-input border border-hairline bg-bg pl-[1.85rem] pr-2.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)] transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] sm:w-48"
              />
            </div>
            {contributors.length > 1 && (
              <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-btn border border-hairline bg-bg p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setAuthor("all")}
                  className={`inline-flex h-7 shrink-0 items-center rounded-[8px] px-2.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                    author === "all" ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  Everyone
                </button>
                {contributors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAuthor(c.id)}
                    className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                      author === c.id ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} aria-hidden />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <ShareNetwork size={26} className="text-faint" />
            <p className="mt-3 text-[14px] font-semibold text-ink">
              {items.length > 0 ? "No matching shared captures" : "Nothing shared with the team yet"}
            </p>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
              {items.length > 0
                ? "Try a different search or contributor."
                : "Open a recording and switch it to Public to share it with the workspace."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {filtered.map((r) => {
              const s = STATUS[r.status] ?? STATUS.uploaded;
              const active = ["transcribing", "processing"].includes(r.status);
              return (
                <article
                  key={r.id}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-card border border-hairline bg-panel-solid transition-[border-color,box-shadow,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-[0_22px_48px_-30px_rgba(26,28,30,0.4)]"
                >
                  <span
                    className="h-[3px] w-full shrink-0"
                    style={{ background: colorFor(r.authorId) }}
                    aria-hidden
                  />
                  <Link href={`/note/${r.id}`} className="absolute inset-0 z-0" aria-label={`Open ${r.title}`} />

                  <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col p-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold text-accent-ink"
                        style={{ background: colorFor(r.authorId) }}
                        title={r.authorName}
                      >
                        {initialOf(r.authorName)}
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[12.5px] font-medium text-ink-soft">{r.authorName}</p>
                        <p className="font-mono text-[10px] text-faint">{r.dateLabel}</p>
                      </div>
                      {r.isMine && (
                        <span className="shrink-0 rounded-pill bg-accent-wash px-2 py-0.5 text-[10.5px] font-medium text-accent-deep">
                          You
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 line-clamp-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                      {r.title}
                    </h3>
                    {(r.summary || s.note) && (
                      <p className={`mt-1 line-clamp-2 text-[12.5px] leading-relaxed ${r.summary ? "text-muted" : "text-faint"}`}>
                        {r.summary || s.note}
                      </p>
                    )}

                    <div className="mt-3.5 flex items-center gap-x-3 border-t border-hairline pt-2.5 font-mono text-[10.5px] text-faint">
                      <span className={`inline-flex items-center gap-1.5 ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${active ? "animate-pulse" : ""}`} />
                        <span className="uppercase tracking-[0.1em]">{s.label}</span>
                      </span>
                      <span className="ml-auto flex items-center gap-x-3">
                        <span>{r.durationLabel}</span>
                        {r.language && (
                          <span className="inline-flex items-center gap-1">
                            <Translate size={10.5} weight="bold" /> {r.language}
                          </span>
                        )}
                        {r.actionCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <ListChecks size={10.5} /> {r.actionCount}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-hairline bg-bg px-4 py-3">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="tabular mt-1 text-[24px] font-semibold tracking-[-0.02em] text-ink">{value}</p>
    </div>
  );
}
