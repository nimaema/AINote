"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Microphone,
  Stop,
  Pause,
  Play,
  UploadSimple,
  X,
  ArrowLeft,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";
import { RealtimeWaveform } from "./realtime-waveform";
import { LiveCaptions } from "./live-captions";
import { Waveform } from "@/components/waveform";

type Mode = "record" | "upload";
type Rec = "idle" | "recording" | "paused" | "ready";
type CaptureSource = "mic" | "system" | "both";

const ACCEPT = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/wav", "audio/x-wav", "audio/wave"];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function humanSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pickMime() {
  const prefs = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const m of prefs) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
      return m;
  }
  return "audio/webm";
}

export function Recorder({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rec, setRec] = useState<Rec>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captureSource, setCaptureSource] = useState<CaptureSource>("mic");
  const [canShareAudio, setCanShareAudio] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payloadRef = useRef<{ blob: Blob; mime: string; name?: string } | null>(null);
  // Extra streams/context to tear down when a capture uses tab audio or mixing.
  const extraStreamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const reset = useCallback(() => {
    stopTimer();
    recorderRef.current = null;
    chunksRef.current = [];
    payloadRef.current = null;
    setRec("idle");
    setElapsed(0);
    setProgress(0);
    setError(null);
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    cleanupCapture();
    setPreviewUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  // Clean up on unmount.
  useEffect(() => () => reset(), [reset]);

  // Tab/system-audio capture is desktop-Chrome-first; detect after mount to
  // avoid a hydration mismatch.
  useEffect(() => {
    setCanShareAudio(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function"
    );
    setSpeechSupported(
      typeof window !== "undefined" &&
        !!(
          (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
        )
    );
  }, []);

  function cleanupCapture() {
    extraStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    extraStreamsRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }

  // Build the audio stream to record from the chosen source. Mic uses the
  // microphone; Meeting captures a shared tab/screen's audio; Both mixes them.
  async function buildStream(source: CaptureSource): Promise<MediaStream> {
    if (source === "mic") {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    const display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const displayAudio = display.getAudioTracks();
    if (displayAudio.length === 0) {
      display.getTracks().forEach((t) => t.stop());
      throw new Error("no-system-audio");
    }
    extraStreamsRef.current.push(display); // torn down (incl. video) on cleanup
    if (source === "system") {
      return new MediaStream(displayAudio);
    }
    // Both: mix mic + tab audio into one recordable stream.
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    extraStreamsRef.current.push(mic);
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(mic).connect(dest);
    ctx.createMediaStreamSource(new MediaStream(displayAudio)).connect(dest);
    return dest.stream;
  }

  async function startRecording() {
    setError(null);
    try {
      const s = await buildStream(captureSource);
      const mime = pickMime();
      const mr = new MediaRecorder(s, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        payloadRef.current = { blob, mime };
        setPreviewUrl(URL.createObjectURL(blob));
        s.getTracks().forEach((t) => t.stop());
        cleanupCapture();
        setStream(null);
        setRec("ready");
      };
      // If the user ends screen/tab sharing from the browser bar, stop cleanly.
      const watchStop = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") stopRecording();
      };
      s.getTracks().forEach((t) => (t.onended = watchStop));
      extraStreamsRef.current.forEach((st) => st.getTracks().forEach((t) => (t.onended = watchStop)));

      recorderRef.current = mr;
      setStream(s);
      mr.start(250);
      setElapsed(0);
      startTimer();
      setRec("recording");
    } catch (e) {
      cleanupCapture();
      const msg = e instanceof Error ? e.message : "";
      if (msg === "no-system-audio") {
        setError("No audio was shared. When prompted, choose a tab or screen and turn on “Share tab audio”.");
      } else if (captureSource === "mic") {
        setError("Microphone access was blocked. Allow it in your browser, or switch to Upload.");
      } else {
        setError("Screen capture was cancelled or blocked. Try again, choose a different source, or switch to Upload.");
      }
    }
  }

  function togglePause() {
    const mr = recorderRef.current;
    if (!mr) return;
    if (rec === "recording") {
      mr.pause();
      stopTimer();
      setRec("paused");
    } else if (rec === "paused") {
      mr.resume();
      startTimer();
      setRec("recording");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    stopTimer();
  }

  async function onFile(f: File) {
    setError(null);
    if (!ACCEPT.includes(f.type) && !/\.(mp3|m4a|wav|webm|ogg)$/i.test(f.name)) {
      setError("Unsupported file. Use MP3, M4A, WAV, WebM, or OGG.");
      return;
    }
    payloadRef.current = { blob: f, mime: f.type || "audio/mpeg", name: f.name };
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, ""));
    // Best-effort duration read.
    const audio = new Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) setElapsed(Math.round(audio.duration));
    };
    setRec("ready");
  }

  async function save() {
    const payload = payloadRef.current;
    if (!payload) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    // Send the audio as the raw request body; metadata rides in the query
    // string. This streams straight to storage, no multipart, so long
    // recordings don't trip the server's form-data parser.
    const ext = payload.mime.includes("webm")
      ? "webm"
      : payload.mime.includes("mp4")
        ? "m4a"
        : "audio";
    const params = new URLSearchParams({ source: mode, mimeType: payload.mime });
    params.set("filename", payload.name ?? `recording.${ext}`);
    if (title.trim()) params.set("title", title.trim());
    if (elapsed > 0) params.set("durationSec", String(elapsed));

    try {
      const id = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/recordings?${params.toString()}`);
        xhr.setRequestHeader("Content-Type", payload.mime || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(e.loaded / e.total);
        };
        xhr.onload = () => {
          try {
            const body = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) resolve(body.id);
            else reject(new Error(body.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(payload.blob);
      });
      router.push(`/note/${id}`);
      router.refresh();
    } catch (e) {
      setUploading(false);
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    reset();
    setTitle("");
    setMode(m);
  }

  const canSave = rec === "ready" && !uploading;

  return (
    <div className="glass rise rounded-panel p-5 sm:p-7">
      {/* Top row: back + mode toggle */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink"
        >
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="glass-soft inline-flex rounded-btn p-1">
          {(["record", "upload"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-btn px-4 text-[13px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                mode === m ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
              }`}
            >
              {m === "record" ? <Microphone size={15} /> : <UploadSimple size={15} />}
              {m === "record" ? "Record" : "Upload"}
            </button>
          ))}
        </div>
      </div>

      {/* Stage */}
      {mode === "record" ? (
        <RecordStage
          rec={rec}
          elapsed={elapsed}
          stream={stream}
          previewUrl={previewUrl}
          source={captureSource}
          onSource={setCaptureSource}
          canShareAudio={canShareAudio}
          captionsOn={captionsOn}
          onToggleCaptions={() => setCaptionsOn((v) => !v)}
          speechSupported={speechSupported}
          onStart={startRecording}
          onStop={stopRecording}
          onPause={togglePause}
          onDiscard={reset}
        />
      ) : (
        <UploadStage
          rec={rec}
          previewUrl={previewUrl}
          fileName={payloadRef.current?.name}
          fileSize={payloadRef.current?.blob.size}
          onFile={onFile}
          onDiscard={reset}
        />
      )}

      {error && (
        <p role="alert" className="mt-5 flex items-center gap-2 text-[13px] text-err">
          <WarningCircle size={16} weight="fill" />
          {error}
        </p>
      )}

      {/* Save row */}
      {rec === "ready" && (
        <div className="mt-6 border-t border-hairline pt-6">
          <label htmlFor="title" className="text-[13px] font-medium text-ink-soft">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name this recording"
            className="mt-2 h-11 w-full rounded-input border border-hairline bg-bg px-4 text-[15px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />

          {uploading ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-muted">Uploading…</span>
                <span className="tabular font-mono text-faint">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full origin-left rounded-full transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
                  style={{
                    transform: `scaleX(${Math.max(progress, 0.04)})`,
                    background:
                      "linear-gradient(90deg, var(--color-accent), var(--color-accent-deep))",
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={save}
              disabled={!canSave}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-accent px-6 text-[15px] font-semibold text-accent-ink shadow-[0_12px_28px_-16px_rgba(214,70,31,0.75)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle size={18} weight="fill" />
              Save &amp; process
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-card border border-hairline bg-bg p-6">
      {children}
    </div>
  );
}

function RecordStage({
  rec,
  elapsed,
  stream,
  previewUrl,
  source,
  onSource,
  canShareAudio,
  captionsOn,
  onToggleCaptions,
  speechSupported,
  onStart,
  onStop,
  onPause,
  onDiscard,
}: {
  rec: Rec;
  elapsed: number;
  stream: MediaStream | null;
  previewUrl: string | null;
  source: CaptureSource;
  onSource: (s: CaptureSource) => void;
  canShareAudio: boolean;
  captionsOn: boolean;
  onToggleCaptions: () => void;
  speechSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onDiscard: () => void;
}) {
  return (
    <Stage>
      {rec === "idle" && (
        <div className="flex flex-col items-center text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            Station 01 ·{" "}
            {source === "mic" ? "microphone" : source === "system" ? "meeting audio" : "mic + meeting"}
          </p>
          <h2 className="mt-2 font-display text-[27px] leading-tight text-ink sm:text-[31px]">
            Ready to listen.
          </h2>
          {canShareAudio && (
            <>
              <div className="mt-5 inline-flex rounded-btn border border-hairline bg-bg p-1">
                {(
                  [
                    ["mic", "Mic"],
                    ["system", "Meeting"],
                    ["both", "Both"],
                  ] as [CaptureSource, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => onSource(val)}
                    className={`inline-flex h-8 items-center rounded-[8px] px-3.5 text-[12.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                      source === val ? "bg-panel-lift text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {source !== "mic" && (
                <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-faint">
                  You&apos;ll pick a tab or screen and turn on “Share tab audio” — great for a call in Meet, Zoom, or a browser tab.
                </p>
              )}
            </>
          )}
          {speechSupported && source !== "system" && (
            <button
              onClick={onToggleCaptions}
              className={`mt-3 inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
                captionsOn ? "border-accent/50 bg-accent-wash text-accent-deep" : "border-hairline text-muted hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${captionsOn ? "bg-accent" : "bg-faint"}`} />
              Live captions {captionsOn ? "on" : "off"}
            </button>
          )}
          <div className="relative mt-7 grid h-24 w-24 place-items-center">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border border-accent/40"
              style={{ animation: "signal-ping 2.4s var(--ease-out) infinite" }}
            />
            <button
              onClick={onStart}
              className="relative grid h-20 w-20 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_16px_36px_-18px_rgba(214,70,31,0.85)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              aria-label="Start recording"
            >
              <Microphone size={30} weight="fill" />
            </button>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Tap to capture
          </p>
        </div>
      )}

      {(rec === "recording" || rec === "paused") && (
        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rec">
              <span
                className={`h-2 w-2 rounded-full bg-rec ${
                  rec === "recording" ? "animate-pulse" : "opacity-40"
                }`}
              />
              {rec === "recording" ? "Recording" : "Paused"}
            </span>
            <span className="tabular font-mono text-[40px] font-medium leading-none text-ink">
              {fmt(elapsed)}
            </span>
            {source !== "mic" && (
              <span className="mt-1 rounded-pill bg-accent-wash px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-deep">
                {source === "system" ? "Meeting audio" : "Mic + meeting"}
              </span>
            )}
          </div>

          <div className="h-24 w-full max-w-lg">
            <RealtimeWaveform stream={stream} active={rec === "recording"} />
          </div>

          <LiveCaptions active={rec === "recording" && captionsOn && source !== "system"} />

          <div className="flex items-center gap-3">
            <button
              onClick={onPause}
              className="glass inline-flex h-11 items-center gap-2 rounded-btn px-5 text-sm font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
            >
              {rec === "recording" ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
              {rec === "recording" ? "Pause" : "Resume"}
            </button>
            <button
              onClick={onStop}
              className="inline-flex h-11 items-center gap-2 rounded-btn bg-accent px-5 text-sm font-semibold text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
            >
              <Stop size={16} weight="fill" /> Stop
            </button>
          </div>
        </div>
      )}

      {rec === "ready" && previewUrl && (
        <ReadyPreview elapsed={elapsed} previewUrl={previewUrl} onDiscard={onDiscard} />
      )}
    </Stage>
  );
}

function UploadStage({
  rec,
  previewUrl,
  fileName,
  fileSize,
  onFile,
  onDiscard,
}: {
  rec: Rec;
  previewUrl: string | null;
  fileName?: string;
  fileSize?: number;
  onFile: (f: File) => void;
  onDiscard: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  if (rec === "ready" && previewUrl) {
    return (
      <Stage>
        <div className="flex w-full max-w-lg flex-col items-center gap-5">
          <div className="w-full truncate text-center text-[15px] font-medium text-ink">
            {fileName}
            {fileSize ? (
              <span className="ml-2 font-mono text-[12px] text-faint">
                {humanSize(fileSize)}
              </span>
            ) : null}
          </div>
          <div className="w-full max-w-md rounded-card border border-hairline bg-panel px-5 py-3">
            <Waveform bars={44} height={44} live={false} />
          </div>
          <audio controls src={previewUrl} className="w-full max-w-md" />
          <button
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink cursor-pointer"
          >
            <X size={14} /> Choose a different file
          </button>
        </div>
      </Stage>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`grid min-h-[240px] w-full place-items-center rounded-card border-2 border-dashed p-6 text-center transition-colors duration-150 [transition-timing-function:var(--ease-out)] cursor-pointer ${
        drag ? "border-accent bg-accent-wash" : "border-hairline-strong bg-bg hover:bg-panel"
      }`}
    >
      <div className="flex flex-col items-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-wash text-accent-deep">
          <UploadSimple size={24} />
        </span>
        <p className="mt-4 text-[15px] font-medium text-ink">
          Drop an audio file, or click to browse
        </p>
        <p className="mt-1 text-[13px] text-muted">MP3, M4A, WAV, WebM, or OGG. Up to 300 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function ReadyPreview({
  elapsed,
  previewUrl,
  onDiscard,
}: {
  elapsed: number;
  previewUrl: string;
  onDiscard: () => void;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-5">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <CheckCircle size={16} weight="fill" className="text-ok" />
        Recorded {elapsed > 0 ? fmt(elapsed) : ""}
      </div>
      <div className="w-full max-w-md rounded-card border border-hairline bg-panel px-5 py-3">
        <Waveform bars={44} height={44} live={false} />
      </div>
      <audio controls src={previewUrl} className="w-full max-w-md" />
      <button
        onClick={onDiscard}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink cursor-pointer"
      >
        <X size={14} /> Discard and re-record
      </button>
    </div>
  );
}
