import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { getAccessibleRecording } from "@/lib/access";
import { getObjectStream } from "@/lib/storage";
import { safeFilename } from "@/lib/export-content";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
};

// Proxies audio from MinIO (which isn't publicly exposed) with Range support so
// the <audio> element can seek. Access follows the shared rule (owner, or any
// signed-in user when public). `?download=1` forces a file download.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) return new Response("Not found", { status: 404 });
  const rec = access.recording;

  const range = req.headers.get("range") ?? undefined;
  const { body, contentType, contentLength, contentRange } =
    await getObjectStream(rec.storageKey, range);

  const type = contentType ?? rec.mimeType ?? "audio/webm";
  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  if (contentLength != null) headers.set("Content-Length", String(contentLength));
  if (contentRange) headers.set("Content-Range", contentRange);

  const download = new URL(req.url).searchParams.get("download");
  if (download) {
    const ext = EXT[type.split(";")[0].trim()] ?? "audio";
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename(rec.title ?? "recording")}.${ext}"`
    );
  }

  return new Response(Readable.toWeb(body) as unknown as ReadableStream, {
    status: range && contentRange ? 206 : 200,
    headers,
  });
}
