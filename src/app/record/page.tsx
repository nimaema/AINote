import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
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
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-2xl px-4 pb-28 md:pb-20 pt-10 sm:px-6">
        <div className="mb-6 px-1">
          <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
            New capture
          </h1>
          <p className="mt-1 text-sm text-muted">
            Record from your mic or upload a file. We&apos;ll take it from there.
          </p>
        </div>
        <Recorder initialMode={initialMode} />
      </main>
    </div>
  );
}
