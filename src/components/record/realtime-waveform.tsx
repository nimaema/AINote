"use client";

import { useEffect, useRef } from "react";

// Live microphone seismograph. Draws the time-domain waveform as a single
// scrolling trace line (not bars) from an AnalyserNode via requestAnimationFrame
// — no React state in the loop. Cleaned up fully on unmount / stream stop.
export function RealtimeWaveform({
  stream,
  active,
}: {
  stream: MediaStream | null;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audio = new AudioCtx();
    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const bins = analyser.fftSize;
    const data = new Uint8Array(bins);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();

    const draw = () => {
      analyser.getByteTimeDomainData(data);
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Reference line — the flat calm the trace disturbs.
      ctx.strokeStyle = "rgba(26, 28, 30, 0.14)";
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([2 * dpr, 5 * dpr]);
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();
      ctx.setLineDash([]);

      // The trace itself: the accent green, amplified for presence.
      ctx.strokeStyle = "#0b7a5c";
      ctx.lineWidth = 1.8 * dpr;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const step = Math.max(1, Math.floor(bins / (w / dpr)));
      let x = 0;
      for (let i = 0; i < bins; i += step) {
        const v = (data[i] - 128) / 128; // -1..1
        const y = mid + v * mid * 1.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, Math.max(2, Math.min(h - 2, y)));
        x += dpr;
        if (x > w) break;
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      source.disconnect();
      audio.close().catch(() => {});
    };
  }, [stream, active]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />;
}
