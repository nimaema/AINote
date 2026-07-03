"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Check, WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Waveform } from "@/components/waveform";

const STEPS = [
  { key: "uploaded", label: "Captured" },
  { key: "transcribing", label: "Transcribing speech" },
  { key: "processing", label: "Analyzing the room" },
  { key: "done", label: "Locked" },
];

export function ProcessingView({
  recordingId,
  initialStatus,
}: {
  recordingId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "done" || status === "failed") {
      router.refresh();
      return;
    }
    timer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/recordings/${recordingId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "done" || data.status === "failed") {
          if (timer.current) clearInterval(timer.current);
          router.refresh();
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recordingId, status, router]);

  if (status === "failed") {
    return (
      <div className="glass rounded-panel p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(229,72,77,0.12)] text-err">
          <WarningCircle size={24} weight="fill" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold text-ink">
          Processing failed
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Something went wrong with this recording. You can try running it again.
        </p>
        <button
          onClick={async () => {
            await fetch(`/api/recordings/${recordingId}/retry`, { method: "POST" });
            setStatus("uploaded");
            router.refresh();
          }}
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-btn bg-accent px-5 text-[14px] font-semibold text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
        >
          <ArrowClockwise size={16} weight="bold" /> Try again
        </button>
      </div>
    );
  }

  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="glass rounded-panel p-8 sm:p-12">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-accent-deep">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" />
        Resolving signal
      </p>
      <h2 className="mt-3 text-center font-display text-[27px] font-normal leading-tight text-ink sm:text-[32px]">
        Tuning your conversation into focus.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[13.5px] text-muted">
        Noise becomes signal — transcript, speakers, and notes. This page updates
        itself the moment it&apos;s yours.
      </p>

      <div className="mx-auto mt-9 w-full max-w-md rounded-card border border-hairline bg-bg px-5 py-5">
        <Waveform bars={52} height={56} />
      </div>

      <ol className="mx-auto mt-8 flex max-w-md flex-col gap-2.5">
        {STEPS.map((step, i) => {
          const state =
            i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
          return (
            <li
              key={step.key}
              className={`flex items-center gap-3 rounded-[12px] border px-3.5 py-2.5 transition-colors duration-300 ${
                state === "active"
                  ? "border-accent/40 bg-accent-wash"
                  : "border-transparent"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  state === "done"
                    ? "bg-lock-wash text-lock"
                    : state === "active"
                      ? "bg-accent text-accent-ink"
                      : "border border-hairline text-faint"
                }`}
              >
                {state === "done" ? (
                  <Check size={14} weight="bold" />
                ) : state === "active" ? (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-faint" />
                )}
              </span>
              <span
                className={`font-mono text-[12.5px] uppercase tracking-[0.12em] ${
                  state === "pending"
                    ? "text-faint"
                    : state === "active"
                      ? "text-ink"
                      : "text-muted"
                }`}
              >
                {step.label}
              </span>
              {state === "done" && (
                <span className="ml-auto font-mono text-[11px] text-lock">ok</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
