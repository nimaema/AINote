import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { loadNoteExport, safeFilename } from "@/lib/export-content";
import { NotePdf } from "@/lib/pdf-document";

export const runtime = "nodejs";
export const maxDuration = 60;

// Renders the note as a designed PDF. Access follows the shared rule
// (owner, or any signed-in user when the recording is public).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const note = await loadNoteExport(id, session.user.id);
  if (!note) return new Response("Not found", { status: 404 });

  const buffer = await renderToBuffer(<NotePdf note={note} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(note.title)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
