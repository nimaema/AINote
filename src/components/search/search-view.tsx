"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, WaveSawtooth } from "@phosphor-icons/react";

type Result = {
  id: string;
  title: string;
  status: string;
  dateLabel: string;
  snippet: string | null;
};

export function SearchView() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const needle = q.trim();
    if (needle.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(needle)}`, { cache: "no-store" });
        const data = await res.json();
        setResults(data.results ?? []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <section className="glass rounded-panel">
      <div className="border-b border-hairline p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search all recordings</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, summaries, and transcripts"
            className="h-12 w-full rounded-[12px] border border-hairline bg-bg pl-11 pr-3 text-[15px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />
        </label>
      </div>

      <div className="min-h-[200px] p-2">
        {q.trim().length < 2 ? (
          <Hint>Type at least two characters to search across everything you can access.</Hint>
        ) : loading && results.length === 0 ? (
          <Hint>Searching…</Hint>
        ) : searched && results.length === 0 ? (
          <div className="grid place-items-center px-6 py-12 text-center">
            <WaveSawtooth size={24} className="text-faint" />
            <p className="mt-3 text-[14px] font-semibold text-ink">No matches</p>
            <p className="mt-1 text-[13px] text-muted">Try different words, a name, or a topic.</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/note/${r.id}`}
                  className="group block rounded-[12px] px-3 py-3 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink group-hover:text-accent-deep">{r.title}</p>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-faint">{r.dateLabel}</span>
                  </div>
                  {r.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{r.snippet}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-[13px] text-muted">{children}</p>;
}
