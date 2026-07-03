"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Check, Copy } from "@phosphor-icons/react";

// Owner-only control to make a recording viewable by any signed-in user.
export function VisibilityToggle({
  recordingId,
  initialPublic,
}: {
  recordingId: string;
  initialPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggle() {
    const next = !isPublic;
    setBusy(true);
    setIsPublic(next); // optimistic
    try {
      const res = await fetch(`/api/recordings/${recordingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setIsPublic(!next); // revert
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/note/${recordingId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={isPublic}
        className={`inline-flex h-10 items-center gap-2 rounded-btn px-3.5 text-[13px] font-medium transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:opacity-60 cursor-pointer ${
          isPublic
            ? "bg-accent text-accent-ink shadow-[0_10px_24px_-14px_rgba(214,70,31,0.7)]"
            : "glass text-ink-soft"
        }`}
        title={isPublic ? "Anyone signed in can view this" : "Only you can view this"}
      >
        {isPublic ? <Globe size={16} weight="fill" /> : <Lock size={16} />}
        {isPublic ? "Public" : "Private"}
      </button>

      {isPublic && (
        <button
          onClick={copyLink}
          className="glass inline-flex h-10 items-center gap-1.5 rounded-btn px-3 text-[13px] font-medium text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer"
          title="Copy link"
        >
          {copied ? <Check size={15} weight="bold" className="text-ok" /> : <Copy size={15} />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Link"}</span>
        </button>
      )}
    </div>
  );
}
