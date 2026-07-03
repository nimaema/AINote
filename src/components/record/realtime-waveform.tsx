"use client";

import { useEffect, useRef } from "react";

// Live microphone visualizer. Draws frequency bars from an AnalyserNode on a
// canvas via requestAnimationFrame (no React state in the loop). Cleaned up
// fully on unmount / when the stream stops.
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
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();

    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    const draw = () => {
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 56;
      const gap = 3 * dpr;
      const bw = (w - gap * (barCount - 1)) / barCount;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#e05a2c");
      grad.addColorStop(1, "#a5350f");
      ctx.fillStyle = grad;

      for (let i = 0; i < barCount; i++) {
        const v = data[Math.floor((i / barCount) * bins)] / 255;
        const bh = Math.max(v * v * h, 2 * dpr);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        roundRect(x, y, bw, bh, bw / 2);
        ctx.fill();
      }
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
