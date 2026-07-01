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
import { Waveform } from "@/components/waveform";

type Mode = "record" | "upload";
type Rec = "idle" | "recording" | "paused" | "ready";

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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payloadRef = useRef<{ blob: Blob; mime: string; name?: string } | null>(null);

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
    setPreviewUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  // Clean up on unmount.
  useEffect(() => () => reset(), [reset]);

  async function startRecording() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        setStream(null);
        setRec("ready");
      };
      recorderRef.current = mr;
      setStream(s);
      mr.start(250);
      setElapsed(0);
      startTimer();
      setRec("recording");
    } catch {
      setError(
        "Microphone access was blocked. Allow it in your browser, or switch to Upload."
      );
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

    const form = new FormData();
    const ext = payload.mime.includes("webm") ? "webm" : "audio";
    form.append("file", payload.blob, payload.name ?? `recording.${ext}`);
    form.append("source", mode);
    form.append("mimeType", payload.mime);
    if (title.trim()) form.append("title", title.trim());
    if (elapsed > 0) form.append("durationSec", String(elapsed));

    try {
      const id = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/recordings");
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
        xhr.send(form);
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
    <div className="glass rise rounded-panel p-6 sm:p-8">
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
                mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"
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
            className="mt-2 h-11 w-full rounded-input border border-hairline bg-white/70 px-4 text-[15px] text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:border-hairline-strong focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-wash)]"
          />

          {uploading ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-muted">Uploading…</span>
                <span className="tabular font-mono text-faint">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(20,22,28,0.08)]">
                <div
                  className="h-full rounded-full transition-[width] duration-150 [transition-timing-function:var(--ease-out)]"
                  style={{
                    width: `${Math.max(progress * 100, 4)}%`,
                    background:
                      "linear-gradient(90deg, var(--color-accent), var(--color-aurora-violet))",
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={save}
              disabled={!canSave}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-ink px-6 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(20,24,40,0.12),0_12px_30px_-10px_rgba(14,165,233,0.6)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
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
    <div className="grid min-h-[240px] place-items-center rounded-card border border-hairline bg-white/40 p-6">
      {children}
    </div>
  );
}

function RecordStage({
  rec,
  elapsed,
  stream,
  previewUrl,
  onStart,
  onStop,
  onPause,
  onDiscard,
}: {
  rec: Rec;
  elapsed: number;
  stream: MediaStream | null;
  previewUrl: string | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onDiscard: () => void;
}) {
  return (
    <Stage>
      {rec === "idle" && (
        <div className="flex flex-col items-center text-center">
          <button
            onClick={onStart}
            className="grid h-20 w-20 place-items-center rounded-full bg-ink text-white shadow-[0_10px_30px_-8px_rgba(14,165,233,0.6)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            aria-label="Start recording"
          >
            <Microphone size={30} weight="fill" />
          </button>
          <p className="mt-5 text-[15px] font-medium text-ink">Ready when you are</p>
          <p className="mt-1 text-[13px] text-muted">
            Tap to start recording from your microphone.
          </p>
        </div>
      )}

      {(rec === "recording" || rec === "paused") && (
        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                rec === "recording" ? "bg-rec animate-pulse" : "bg-faint"
              }`}
            />
            <span className="tabular font-mono text-[26px] font-semibold text-ink">
              {fmt(elapsed)}
            </span>
          </div>

          <div className="h-24 w-full max-w-lg">
            <RealtimeWaveform stream={stream} active={rec === "recording"} />
          </div>

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
              className="inline-flex h-11 items-center gap-2 rounded-btn bg-ink px-5 text-sm font-medium text-white transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 cursor-pointer"
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
          <div className="w-full max-w-md rounded-card border border-hairline bg-white/50 px-5 py-3">
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
        drag ? "border-accent bg-accent-wash" : "border-hairline-strong bg-white/40 hover:bg-white/60"
      }`}
    >
      <div className="flex flex-col items-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-wash text-accent-deep">
          <UploadSimple size={24} />
        </span>
        <p className="mt-4 text-[15px] font-medium text-ink">
          Drop an audio file, or click to browse
        </p>
        <p className="mt-1 text-[13px] text-muted">MP3, M4A, WAV, WebM, or OGG · up to 300 MB</p>
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
        Recorded {elapsed > 0 ? `· ${fmt(elapsed)}` : ""}
      </div>
      <div className="w-full max-w-md rounded-card border border-hairline bg-white/50 px-5 py-3">
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
