import { auth } from "@/lib/auth";
import { loadNoteExport, toMarkdown, safeFilename } from "@/lib/export-content";

// Downloads the note as a Markdown file. No third-party setup required.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const note = await loadNoteExport(id, session.user.id);
  if (!note) return new Response("Not found", { status: 404 });

  return new Response(toMarkdown(note), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(note.title)}.md"`,
    },
  });
}
