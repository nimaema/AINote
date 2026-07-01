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
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "bin";
}

// POST /api/recordings — multipart upload of a recorded/uploaded audio blob.
// Streams the body straight to MinIO, then creates the recording row.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 300 MB)." },
      { status: 413 }
    );
  }

  const source = form.get("source") === "record" ? "record" : "upload";
  const mimeType = (form.get("mimeType") as string) || file.type || "audio/webm";
  const durationRaw = form.get("durationSec");
  const durationSec = durationRaw ? Math.round(Number(durationRaw)) || null : null;

  const rawTitle = (form.get("title") as string)?.trim();
  const fallbackTitle =
    source === "upload" && file.name
      ? file.name.replace(/\.[^.]+$/, "")
      : `Recording · ${new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`;
  const title = rawTitle || fallbackTitle;

  const ext = extFor(mimeType, file.name);
  const storageKey = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const nodeStream = Readable.fromWeb(
      file.stream() as unknown as import("node:stream/web").ReadableStream
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
      sizeBytes: file.size,
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
