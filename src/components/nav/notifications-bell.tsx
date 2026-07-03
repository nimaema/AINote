"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, UserCirclePlus, ChatCircleText, ListChecks, At, FolderSimple } from "@phosphor-icons/react";

type Item = {
  id: string;
  type: "assigned" | "mentioned" | "shared" | "commented" | "project_added";
  body: string;
  actorName: string | null;
  recordingId: string | null;
  projectId: string | null;
  read: boolean;
  createdAt: string;
};

const ICON: Record<Item["type"], React.ReactNode> = {
  assigned: <ListChecks size={15} weight="duotone" />,
  mentioned: <At size={15} weight="bold" />,
  commented: <ChatCircleText size={15} weight="duotone" />,
  shared: <UserCirclePlus size={15} weight="duotone" />,
  project_added: <FolderSimple size={15} weight="duotone" />,
};

function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsBell({ align = "left" }: { align?: "left" | "right" }) {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* keep last state */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
    }
  }

  const href = (i: Item) =>
    i.recordingId ? `/note/${i.recordingId}` : i.projectId ? `/project/${i.projectId}` : "/";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative grid h-8 w-8 place-items-center rounded-input text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift hover:text-ink cursor-pointer"
      >
        <Bell size={17} weight={unread > 0 ? "fill" : "regular"} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-accent-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`glass-menu pop-in absolute top-full z-50 mt-2 w-80 overflow-hidden rounded-panel ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-hairline px-3.5 py-2.5">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Inbox</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell size={22} className="mx-auto text-faint" />
                <p className="mt-2 text-[13px] text-muted">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((i) => (
                <Link
                  key={i.id}
                  href={href(i)}
                  onClick={() => setOpen(false)}
                  className={`flex gap-2.5 rounded-[10px] px-2.5 py-2 transition-colors duration-150 hover:bg-panel-lift ${
                    i.read ? "" : "bg-accent-wash/60"
                  }`}
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hairline bg-bg text-accent-deep">
                    {ICON[i.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-ink-soft">
                      <span className="font-semibold text-ink">{i.actorName ?? "Someone"}</span> {i.body}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-faint">{ago(i.createdAt)}</span>
                  </span>
                  {!i.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
