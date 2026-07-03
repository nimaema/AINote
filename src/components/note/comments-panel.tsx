"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircleText, PaperPlaneRight, MapPin, At, X, Trash } from "@phosphor-icons/react";
import { useNoteAudio } from "@/components/note/note-audio";
import { UserPicker, type PickUser } from "@/components/team/user-picker";

type Comment = {
  id: string;
  body: string;
  startMs: number | null;
  authorId: string;
  authorName: string;
  createdAt: string;
};

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function ago(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CommentsPanel({ recordingId, meId }: { recordingId: string; meId: string }) {
  const { currentMs, seekTo } = useNoteAudio();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [pinMoment, setPinMoment] = useState(false);
  const [mentions, setMentions] = useState<PickUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/recordings/${recordingId}/comments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {});
  }, [recordingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          startMs: pinMoment ? Math.round(currentMs) : null,
          mentions: mentions.map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments((c) => [...c, data.comment]);
        setBody("");
        setMentions([]);
        setPinMoment(false);
      }
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) setComments(prev);
  }

  function addMention(u: PickUser) {
    setMentionOpen(false);
    if (!mentions.some((m) => m.id === u.id)) setMentions((m) => [...m, u]);
    setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${u.name} `);
  }

  return (
    <section className="glass flex flex-col rounded-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-wash text-accent-deep">
          <ChatCircleText size={15} weight="fill" />
        </span>
        <h2 className="text-[13.5px] font-semibold text-ink">Discussion</h2>
        <span className="ml-auto font-mono text-[11px] text-faint">{comments.length}</span>
      </div>

      <div ref={scrollRef} className="max-h-[420px] min-h-[120px] flex-1 overflow-y-auto px-4 py-4">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">
            No comments yet. Pin a moment and start the thread.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id} className="group flex gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink">
                  {c.authorName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{c.authorName}</span>
                    <span className="font-mono text-[10.5px] text-faint">{ago(c.createdAt)}</span>
                    {c.startMs != null && (
                      <button
                        onClick={() => seekTo(c.startMs!)}
                        className="inline-flex items-center gap-1 rounded-pill border border-lock/30 px-1.5 py-0.5 font-mono text-[10.5px] text-lock hover:bg-lock-wash cursor-pointer"
                        title="Play this moment"
                      >
                        <MapPin size={10} weight="fill" /> {fmtMs(c.startMs)}
                      </button>
                    )}
                    {c.authorId === meId && (
                      <button
                        onClick={() => remove(c.id)}
                        aria-label="Delete comment"
                        className="ml-auto text-faint opacity-0 transition-opacity hover:text-err group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="relative border-t border-hairline p-3">
        {mentions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 rounded-pill bg-accent-wash px-2 py-0.5 text-[11.5px] text-accent-deep">
                @{m.name}
                <button type="button" onClick={() => setMentions((x) => x.filter((y) => y.id !== m.id))} aria-label="Remove mention" className="cursor-pointer">
                  <X size={10} weight="bold" />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder="Add to the discussion…"
          rows={2}
          className="w-full resize-none rounded-input border border-hairline bg-bg px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--color-accent-wash)] transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPinMoment((p) => !p)}
            className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-[12px] transition-colors duration-150 cursor-pointer ${
              pinMoment ? "border-lock/50 bg-lock-wash text-lock" : "border-hairline text-muted hover:text-ink"
            }`}
            title="Attach the current audio position"
          >
            <MapPin size={13} weight={pinMoment ? "fill" : "regular"} />
            {pinMoment ? fmtMs(currentMs) : "Pin moment"}
          </button>
          <button
            type="button"
            onClick={() => setMentionOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-pill border border-hairline px-2.5 py-1 text-[12px] text-muted transition-colors duration-150 hover:text-ink cursor-pointer"
          >
            <At size={13} weight="bold" /> Mention
          </button>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            aria-label="Post comment"
            className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <PaperPlaneRight size={16} weight="fill" />
          </button>
        </div>

        {mentionOpen && (
          <div className="glass-menu pop-in absolute bottom-full left-3 right-3 z-40 mb-2 rounded-card p-2">
            <UserPicker autoFocus onPick={addMention} exclude={[meId, ...mentions.map((m) => m.id)]} placeholder="Mention a teammate" />
          </div>
        )}
      </form>
    </section>
  );
}
