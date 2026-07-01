import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteIntegration } from "@/lib/integrations";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteIntegration(session.user.id, "google");
  return NextResponse.json({ ok: true });
}
