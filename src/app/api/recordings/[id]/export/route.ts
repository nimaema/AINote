import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, exports } from "@/db/schema";
import { loadNoteExport, toPlainText, toMarkdown, toTeamsHtml, safeFilename } from "@/lib/export-content";
import { createGoogleDoc } from "@/lib/google";
import { uploadTranscript, postChannelMessage } from "@/lib/microsoft";
import { getValidGoogleToken, getValidMicrosoftToken, getIntegration } from "@/lib/integrations";

export const runtime = "nodejs";

const schema = z.object({ target: z.enum(["google_docs", "teams"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rec = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, id), eq(recordings.userId, session.user.id)),
    columns: { id: true },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown export target" }, { status: 400 });
  }
  const target = parsed.data.target;

  const note = await loadNoteExport(id, session.user.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [row] = await db
    .insert(exports)
    .values({ recordingId: id, userId: session.user.id, target, status: "pending" })
    .returning({ id: exports.id });

  const fail = async (msg: string, status = 400) => {
    await db.update(exports).set({ status: "failed", error: msg }).where(eq(exports.id, row.id));
    return NextResponse.json({ error: msg }, { status });
  };

  try {
    if (target === "google_docs") {
      const token = await getValidGoogleToken(session.user.id);
      if (!token) return fail("Connect Google Docs in Settings first.");
      const doc = await createGoogleDoc(token, note.title, toPlainText(note));
      await db
        .update(exports)
        .set({ status: "done", externalUrl: doc.url })
        .where(eq(exports.id, row.id));
      return NextResponse.json({ url: doc.url });
    }

    // Teams (Microsoft Graph): upload the transcript as a .md file into the
    // channel's Files, then post the summary with a link to it.
    const token = await getValidMicrosoftToken(session.user.id);
    if (!token) return fail("Connect Microsoft Teams in Settings first.");
    const it = await getIntegration(session.user.id, "teams");
    const teamId = it?.config?.teamId;
    const channelId = it?.config?.channelId;
    if (!teamId || !channelId) return fail("Pick a Teams channel in Settings first.");

    const noteUrl = `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/note/${id}`;
    const { webUrl } = await uploadTranscript(
      token,
      teamId,
      channelId,
      `${safeFilename(note.title)}.md`,
      toMarkdown(note)
    );
    await postChannelMessage(token, teamId, channelId, toTeamsHtml(note, webUrl, noteUrl));

    await db.update(exports).set({ status: "done", externalUrl: webUrl }).where(eq(exports.id, row.id));
    return NextResponse.json({ url: webUrl });
  } catch (err) {
    console.error("export failed", err);
    return fail(
      err instanceof Error ? err.message : "Export failed",
      500
    );
  }
}
