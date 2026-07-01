import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, recordings } from "@/db/schema";
import { relativeTime, humanTotalTime, humanBytes } from "@/lib/format";
import { AppHeader } from "@/components/app-header";
import { UsersAdmin, type UserRow } from "@/components/admin/users-admin";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rows = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    columns: { id: true, name: true, email: true, role: true, active: true },
  });

  // Usage per user, aggregated from recordings.
  const usage = await db
    .select({
      userId: recordings.userId,
      count: sql<number>`count(*)::int`,
      duration: sql<number>`coalesce(sum(${recordings.durationSec}), 0)::int`,
      bytes: sql<number>`coalesce(sum(${recordings.sizeBytes}), 0)::float8`,
      lastAt: sql<string | null>`max(${recordings.createdAt})`,
    })
    .from(recordings)
    .groupBy(recordings.userId);

  const byUser = new Map(usage.map((u) => [u.userId, u]));
  const now = new Date();

  const enriched: UserRow[] = rows.map((u) => {
    const usg = byUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      recordings: usg?.count ?? 0,
      timeLabel: humanTotalTime(usg?.duration ?? 0),
      storageLabel: humanBytes(usg?.bytes ?? 0),
      lastActiveLabel: usg?.lastAt ? relativeTime(new Date(usg.lastAt), now) : "—",
    };
  });

  const totals = {
    users: rows.length,
    recordings: usage.reduce((a, u) => a + u.count, 0),
    duration: usage.reduce((a, u) => a + u.duration, 0),
    bytes: usage.reduce((a, u) => a + u.bytes, 0),
  };

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">Users</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Manage access and see how the workspace is being used.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="People" value={String(totals.users)} />
          <Stat label="Recordings" value={String(totals.recordings)} />
          <Stat label="Total time" value={humanTotalTime(totals.duration)} />
          <Stat label="Storage" value={humanBytes(totals.bytes)} />
        </div>

        <UsersAdmin users={enriched} meId={session.user.id} />
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-soft rounded-card px-4 py-3.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="tabular mt-1 font-display text-[22px] font-bold text-ink">{value}</p>
    </div>
  );
}
