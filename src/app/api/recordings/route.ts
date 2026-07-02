import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { putObject } from "@/lib/storage";
import { enqueueTranscribe } from "@/lib/queue";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

function extFor(mime: string, filename?: string) {
  // Ignore any codec suffix, e.g. "audio/webm;codecs=opus".
  const base = mime.split(";")[0].trim();
  if (EXT_BY_MIME[base]) return EXT_BY_MIME[base];
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "bin";
}

// POST /api/recordings: the audio is sent as the RAW request body (not
// multipart); metadata rides in the query string. The body is streamed straight
// to MinIO so nothing is buffered in memory and there is no multipart parser to
// choke on large (e.g. 30-minute) recordings.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!req.body) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  const params = new URL(req.url).searchParams;
  const source = params.get("source") === "record" ? "record" : "upload";
  const mimeType =
    params.get("mimeType") || req.headers.get("content-type") || "audio/webm";
  const filename = params.get("filename") || undefined;
  const durationRaw = params.get("durationSec");
  const durationSec = durationRaw ? Math.round(Number(durationRaw)) || null : null;

  // XMLHttpRequest sets Content-Length for a Blob body, so we can reject
  // oversized uploads before streaming a single byte to storage.
  const lenHeader = req.headers.get("content-length");
  const sizeBytes = lenHeader != null ? Number(lenHeader) : null;
  if (sizeBytes === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (sizeBytes != null && sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 300 MB)." }, { status: 413 });
  }

  const rawTitle = params.get("title")?.trim();
  const fallbackTitle =
    source === "upload" && filename
      ? filename.replace(/\.[^.]+$/, "")
      : `Recording - ${new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`;
  const title = rawTitle || fallbackTitle;

  const ext = extFor(mimeType, filename);
  const storageKey = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const nodeStream = Readable.fromWeb(
      req.body as unknown as import("node:stream/web").ReadableStream
    );
    await putObject(storageKey, nodeStream, mimeType);
  } catch (err) {
    console.error("upload to storage failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const [row] = await db
    .insert(recordings)
    .values({
      userId: session.user.id,
      title,
      source,
      storageKey,
      mimeType,
      durationSec,
      sizeBytes: sizeBytes ?? null,
      status: "uploaded",
    })
    .returning({ id: recordings.id });

  // Kick off transcription. If Redis is momentarily unavailable, keep the
  // recording (it stays "uploaded") rather than failing the upload.
  try {
    await enqueueTranscribe(row.id);
  } catch (err) {
    console.error("failed to enqueue transcription", err);
  }

  return NextResponse.json({ id: row.id }, { status: 201 });
}
