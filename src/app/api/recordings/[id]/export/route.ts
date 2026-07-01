import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { recordings, exports } from "@/db/schema";
import { loadNoteExport, toPlainText, toTeamsCard } from "@/lib/export-content";
import { createGoogleDoc } from "@/lib/google";
import { getValidGoogleToken, getIntegration } from "@/lib/integrations";

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

    // Teams
    const it = await getIntegration(session.user.id, "teams");
    const webhookUrl = it?.config?.webhookUrl;
    if (!webhookUrl) return fail("Add a Teams webhook in Settings first.");

    const noteUrl = `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/note/${id}`;
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toTeamsCard(note, noteUrl)),
    });
    if (!res.ok) throw new Error(`Teams responded ${res.status}`);
    await db.update(exports).set({ status: "done" }).where(eq(exports.id, row.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("export failed", err);
    return fail(
      err instanceof Error ? err.message : "Export failed",
      500
    );
  }
}
