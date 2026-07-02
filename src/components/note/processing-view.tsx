"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Check, WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Waveform } from "@/components/waveform";

const STEPS = [
  { key: "uploaded", label: "Uploaded" },
  { key: "transcribing", label: "Transcribing" },
  { key: "processing", label: "Summarizing" },
  { key: "done", label: "Ready" },
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
          className="mx-auto mt-5 inline-flex h-10 items-center gap-2 rounded-btn bg-ink px-5 text-[14px] font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
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
    <div className="glass rounded-panel p-8 sm:p-10">
      <div className="mx-auto mb-8 w-full max-w-md rounded-card border border-hairline bg-white/50 px-5 py-4">
        <Waveform bars={52} height={56} />
      </div>
      <h2 className="text-center text-[17px] font-semibold text-ink">
        Working on your notes
      </h2>
      <p className="mt-1.5 text-center text-sm text-muted">
        Transcribing and summarizing. This page updates itself when it&apos;s ready.
      </p>

      <ol className="mx-auto mt-8 flex max-w-md flex-col gap-3">
        {STEPS.map((step, i) => {
          const state =
            i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  state === "done"
                    ? "bg-accent-wash text-accent-deep"
                    : state === "active"
                      ? "bg-ink text-white"
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
                className={`text-sm ${
                  state === "pending" ? "text-faint" : "text-ink"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
