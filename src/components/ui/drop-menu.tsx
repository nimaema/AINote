"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Anchored dropdown rendered in a portal with `position: fixed`, so it can
// never be clipped by overflow-hidden ancestors or buried under the shell.
// Clamped to the viewport horizontally and flips above the anchor when there
// isn't room below. Closes on backdrop click and Escape.
export function DropMenu({
  open,
  onClose,
  anchor,
  align = "end",
  width = 224,
  className = "p-1.5",
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  align?: "start" | "end";
  width?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const a = anchor.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(width, vw - 16);
      let left = align === "end" ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      let top = r.bottom + 6;
      const h = menuRef.current?.offsetHeight ?? 0;
      if (h && top + h > vh - 8) top = Math.max(8, r.top - 6 - h);
      setPos({ top, left });
    };
    place();
    // Second pass once the menu has a measured height (for flip-up).
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div
        ref={menuRef}
        role="menu"
        className={`glass-menu pop-in fixed z-[71] rounded-card ${className}`}
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          width: Math.min(width, window.innerWidth - 16),
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
