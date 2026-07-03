"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export type PickUser = { id: string; name: string; email: string | null };

// Typeahead over the workspace directory (/api/users). Reused by the assignee,
// member, and mention pickers.
export function UserPicker({
  onPick,
  exclude = [],
  placeholder = "Search teammates",
  autoFocus = false,
}: {
  onPick: (u: PickUser) => void;
  exclude?: string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickUser[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json();
        setResults((data.users ?? []).filter((u: PickUser) => !exclude.includes(u.id)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, exclude.join(",")]);

  return (
    <div className="w-full">
      <div className="relative">
        <MagnifyingGlass size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-input border border-hairline bg-bg pl-8 pr-2.5 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)] transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)]"
        />
      </div>
      <div className="mt-1.5 max-h-52 overflow-y-auto">
        {results.length === 0 ? (
          <p className="px-2 py-2 text-[12.5px] text-faint">{loading ? "Searching…" : "No teammates found"}</p>
        ) : (
          results.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onPick(u);
                setQ("");
                setResults([]);
              }}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-panel-lift cursor-pointer"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-ink">
                {u.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{u.name}</span>
                {u.email && <span className="block truncate text-[11.5px] text-faint">{u.email}</span>}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
