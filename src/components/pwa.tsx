"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Registers the service worker and, on browsers that support it, surfaces a
// tasteful install affordance. No-op if already installed or dismissed.
export function Pwa() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // updateViaCache: "none" keeps the browser from HTTP-caching sw.js, so a
      // new worker (and its cache purge) is picked up on the next visit.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || localStorage.getItem("gnn-install-dismissed") === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setShow(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem("gnn-install-dismissed", "1");
    setShow(false);
  }

  return (
    <div className="pop-in fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-panel md:inset-x-auto md:right-5 md:bottom-5 md:mx-0 glass-menu p-3 pl-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-accent-wash text-accent-deep">
        <DownloadSimple size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink">Install GlaciaNav Notes</p>
        <p className="text-[12px] text-muted">Add it to your home screen for an app-like experience.</p>
      </div>
      <button
        onClick={install}
        className="h-9 shrink-0 rounded-btn bg-ink px-3.5 text-[13px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] cursor-pointer"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-input text-faint hover:text-ink cursor-pointer"
      >
        <X size={15} />
      </button>
    </div>
  );
}
