import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pipelineQueue } from "@/lib/queue";

export const runtime = "nodejs";

// Snapshot of the BullMQ pipeline queue for the admin ops view.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const counts = await pipelineQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );
    const failedJobs = await pipelineQueue.getFailed(0, 5);
    const failed = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      recordingId: (j.data as { recordingId?: string })?.recordingId ?? null,
      reason: (j.failedReason ?? "").slice(0, 240),
    }));
    return NextResponse.json({ counts, failed });
  } catch (err) {
    console.error("queue health failed", err);
    return NextResponse.json({ error: "Queue is unreachable (is Redis up?)." }, { status: 502 });
  }
}
