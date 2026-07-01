import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import { getObjectStream } from "@/lib/storage";

export const runtime = "nodejs";

// Proxies audio from MinIO (which isn't publicly exposed) with Range support so
// the <audio> element can seek. Owner-only.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
  });
  if (!rec) return new Response("Not found", { status: 404 });

  const range = req.headers.get("range") ?? undefined;
  const { body, contentType, contentLength, contentRange } =
    await getObjectStream(rec.storageKey, range);

  const headers = new Headers({
    "Content-Type": contentType ?? rec.mimeType ?? "audio/webm",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  if (contentLength != null) headers.set("Content-Length", String(contentLength));
  if (contentRange) headers.set("Content-Range", contentRange);

  return new Response(Readable.toWeb(body) as unknown as ReadableStream, {
    status: range && contentRange ? 206 : 200,
    headers,
  });
}
