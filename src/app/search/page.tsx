import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceQaMessages } from "@/db/schema";
import type { Citation } from "@/db/schema";
import { AppShell } from "@/components/shell/app-shell";
import { SearchView } from "@/components/search/search-view";
import { QAPanel } from "@/components/note/qa-panel";

// The retrieval hub: full-text search + a workspace-wide "ask everything" thread.
export default async function SearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const history = await db.query.workspaceQaMessages.findMany({
    where: eq(workspaceQaMessages.userId, session.user.id),
    orderBy: [asc(workspaceQaMessages.createdAt)],
  });

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        <div className="mb-5 border-b border-hairline px-1 pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Workspace · retrieval</p>
          <h1 className="mt-1.5 font-display text-[30px] leading-none tracking-[-0.01em] text-ink sm:text-[38px]">
            Find anything. Ask everything.
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Search every recording you can access, or ask one question across all of them.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <SearchView />
          <div className="xl:sticky xl:top-6 xl:self-start">
            <QAPanel
              endpoint="/api/ask"
              title="Ask everything"
              emptyHint="Ask one question across every recording you can access."
              suggestions={[
                "What did we decide recently?",
                "What action items are still open?",
                "Summarize the latest conversations",
              ]}
              initialMessages={history.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                citations: m.citations as Citation[] | null,
              }))}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
