import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { Recorder } from "@/components/record/recorder";

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { mode } = await searchParams;
  const initialMode = mode === "upload" ? "upload" : "record";

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        <div className="mb-5 border-b border-hairline px-1 pb-5">
          <p className="font-mono text-[11px] text-faint">Input deck</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.015em] text-ink">New capture</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Record from your mic or upload a file. We&apos;ll take it from there.
          </p>
        </div>
        <Recorder initialMode={initialMode} />
      </main>
    </AppShell>
  );
}
