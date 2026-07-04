import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, results, transcripts, projects } from "@/db/schema";
import { putObject } from "@/lib/storage";
import { enqueueTranscribe } from "@/lib/queue";
import { relativeTime, dateTimeLabel, humanDuration, humanBytes } from "@/lib/format";
import { languageName } from "@/lib/language";

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

  // Optional per-user storage quota (opt-in via env).
  const quotaMb = Number(process.env.USER_STORAGE_QUOTA_MB);
  if (quotaMb > 0 && sizeBytes != null) {
    const [{ used }] = await db
      .select({ used: sql<number>`coalesce(sum(${recordings.sizeBytes}), 0)::bigint` })
      .from(recordings)
      .where(eq(recordings.userId, session.user.id));
    if (Number(used) + sizeBytes > quotaMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `Storage quota reached (${quotaMb} MB). Delete some recordings and try again.` },
        { status: 413 }
      );
    }
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

// GET /api/recordings?offset=&limit= : a page of the user's recordings, shaped
// for the dashboard's "load more". Keeps the dashboard from silently capping.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const params = new URL(req.url).searchParams;
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));

  const rows = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      status: recordings.status,
      source: recordings.source,
      createdAt: recordings.createdAt,
      durationSec: recordings.durationSec,
      sizeBytes: recordings.sizeBytes,
      isPublic: recordings.isPublic,
      error: recordings.error,
      language: transcripts.language,
      summary: results.summary,
      topics: results.topics,
      actionItems: results.actionItems,
      decisions: results.decisions,
      followUps: results.followUps,
      projectId: recordings.projectId,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(recordings)
    .leftJoin(results, eq(results.recordingId, recordings.id))
    .leftJoin(transcripts, eq(transcripts.recordingId, recordings.id))
    .leftJoin(projects, eq(projects.id, recordings.projectId))
    .where(eq(recordings.userId, userId))
    .orderBy(desc(recordings.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const now = new Date();
  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled recording",
    status: r.status,
    source: r.source,
    dateLabel: relativeTime(r.createdAt, now),
    createdAtLabel: dateTimeLabel(r.createdAt),
    durationLabel: humanDuration(r.durationSec),
    sizeLabel: humanBytes(r.sizeBytes),
    isPublic: r.isPublic,
    error: r.error,
    language: languageName(r.language),
    summary: r.summary,
    topics: r.topics ?? [],
    actionItems: r.actionItems ?? [],
    decisions: r.decisions ?? [],
    followUps: r.followUps ?? [],
    projectId: r.projectId,
    projectName: r.projectName,
    projectColor: r.projectColor,
  }));

  return NextResponse.json({ items, hasMore });
}
