import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAccessibleRecording } from "@/lib/access";

// Lightweight status poll for the processing view.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await getAccessibleRecording(id, session.user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: access.recording.status,
    error: access.recording.error,
  });
}
