"use client";

import { useEffect, useRef, useState } from "react";

// Best-effort live captions while recording, using the browser's SpeechRecognition
// (Web Speech API). This is a *preview only* — the authoritative, diarized
// transcript is produced by the server on save. Opt-in and feature-detected.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recognition = any;

export function LiveCaptions({ active }: { active: boolean }) {
  const [text, setText] = useState("");
  const finalRef = useRef("");
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    if (!active) return;
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r: Recognition = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setText((finalRef.current + interim).slice(-280));
    };
    r.onend = () => {
      if (active) {
        try {
          r.start();
        } catch {
          /* already started */
        }
      }
    };
    try {
      r.start();
    } catch {
      /* ignore */
    }
    recRef.current = r;

    return () => {
      try {
        r.onend = null;
        r.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="w-full max-w-lg rounded-card border border-hairline bg-bg px-4 py-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        Live captions · browser preview
      </p>
      <p className="mt-1.5 min-h-[2.75em] text-[13.5px] leading-relaxed text-ink-soft">
        {text || "Listening…"}
      </p>
    </div>
  );
}
