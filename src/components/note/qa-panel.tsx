"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PaperPlaneRight, Sparkle } from "@phosphor-icons/react";
import type { Citation } from "@/db/schema";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
};

function fmtMs(ms?: number | null) {
  if (ms == null) return null;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function QAPanel({
  endpoint,
  initialMessages,
  title = "Ask about this recording",
  suggestions = ["Summarize the decisions", "What are my action items?", "What's still open?"],
  emptyHint = "Ask anything about what was said.",
}: {
  endpoint: string;
  initialMessages: Msg[];
  title?: string;
  suggestions?: string[];
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer, citations: data.citations }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="glass flex h-[560px] flex-col rounded-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-wash text-accent-deep">
          <Sparkle size={15} weight="fill" />
        </span>
        <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] text-muted">{emptyHint}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  onClick={() => ask(sug)}
                  className="rounded-btn border border-hairline bg-white/60 px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-accent hover:text-accent-deep cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.id ?? i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-card px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  m.role === "user" ? "bg-ink text-white" : "border border-hairline bg-white/70 text-ink-soft"
                }`}
              >
                {m.content}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.citations.map((c, j) => {
                      const time = fmtMs(c.startMs);
                      const label = [c.recordingTitle, c.speaker ?? (c.recordingTitle ? null : "clip"), time]
                        .filter(Boolean)
                        .join(" · ");
                      const chip = (
                        <span className="inline-block rounded-btn bg-accent-wash px-2 py-0.5 font-mono text-[10.5px] text-accent-deep">
                          {label}
                        </span>
                      );
                      return c.recordingId ? (
                        <Link key={j} href={`/note/${c.recordingId}`} className="hover:opacity-80">
                          {chip}
                        </Link>
                      ) : (
                        <span key={j}>{chip}</span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-card border border-hairline bg-white/70 px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-faint"
                  style={{ animation: `wave 700ms ${i * 140}ms var(--ease-in-out) infinite alternate` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-hairline p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="h-11 flex-1 rounded-input border border-hairline bg-white/70 px-4 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <PaperPlaneRight size={17} weight="fill" />
        </button>
      </form>
    </div>
  );
}
