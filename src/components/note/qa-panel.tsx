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
  onSeek,
}: {
  endpoint: string;
  initialMessages: Msg[];
  title?: string;
  suggestions?: string[];
  emptyHint?: string;
  // When provided, a citation for this same recording scrubs the audio to its
  // moment instead of navigating — the answer shows its work.
  onSeek?: (ms: number) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
  }, [messages, pending]);

  function patchLastAssistant(update: (m: Msg) => Msg) {
    setMessages((prev) => {
      const copy = prev.slice();
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "assistant") {
          copy[i] = update(copy[i]);
          break;
        }
      }
      return copy;
    });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    // Add the question and an empty assistant bubble that fills in as it streams.
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pre = "";
      let meta = false;
      let citations: Citation[] | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!meta) {
          // First line is JSON metadata: { citations }.
          pre += chunk;
          const nl = pre.indexOf("\n");
          if (nl < 0) continue;
          try {
            citations = JSON.parse(pre.slice(0, nl)).citations ?? null;
          } catch {
            citations = null;
          }
          meta = true;
          const rest = pre.slice(nl + 1);
          patchLastAssistant((m) => ({ ...m, content: m.content + rest, citations }));
        } else {
          patchLastAssistant((m) => ({ ...m, content: m.content + chunk }));
        }
      }
      patchLastAssistant((m) => ({ ...m, citations: citations ?? m.citations }));
    } catch (e) {
      patchLastAssistant((m) => ({
        ...m,
        content: e instanceof Error ? e.message : "Something went wrong. Try again.",
      }));
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
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] text-muted">{emptyHint}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  onClick={() => ask(sug)}
                  className="rounded-btn border border-hairline bg-bg px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:border-accent hover:text-accent-deep cursor-pointer"
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
                  m.role === "user" ? "bg-accent text-accent-ink" : "border border-hairline bg-bg text-ink-soft"
                }`}
              >
                {m.content || (m.role === "assistant" ? <TypingDots /> : null)}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.citations.map((c, j) => {
                      const time = fmtMs(c.startMs);
                      const label = [c.recordingTitle, c.speaker ?? (c.recordingTitle ? null : "clip"), time]
                        .filter(Boolean)
                        .join(" / ");
                      const chipClass =
                        "inline-block rounded-btn bg-accent-wash px-2 py-0.5 font-mono text-[10.5px] text-accent-deep";
                      if (c.recordingId) {
                        return (
                          <Link key={j} href={`/note/${c.recordingId}`} className="hover:opacity-80">
                            <span className={chipClass}>{label}</span>
                          </Link>
                        );
                      }
                      if (onSeek && c.startMs != null) {
                        return (
                          <button
                            key={j}
                            onClick={() => onSeek(c.startMs!)}
                            className={`${chipClass} cursor-pointer transition-colors hover:bg-lock-wash hover:text-lock`}
                            title="Play the moment this came from"
                          >
                            ↳ {label}
                          </button>
                        );
                      }
                      return (
                        <span key={j} className={chipClass}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
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
          className="h-11 flex-1 rounded-input border border-hairline bg-bg px-4 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <PaperPlaneRight size={17} weight="fill" />
        </button>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-faint"
          style={{ animation: `wave 700ms ${i * 140}ms var(--ease-in-out) infinite alternate` }}
        />
      ))}
    </span>
  );
}
