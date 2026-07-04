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
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Survey deck · sheet 01</p>
          <h1 className="mt-1.5 font-display text-[26px] leading-none text-ink">New survey</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Record your mic or a meeting, or drop in a file. It gets charted into notes you own.
          </p>
        </div>
        <Recorder initialMode={initialMode} />
      </main>
    </AppShell>
  );
}
