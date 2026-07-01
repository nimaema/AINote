import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const rows = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
          Users
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Add people, set roles, and manage access. There is no public signup.
        </p>
        <UsersAdmin users={rows} meId={session.user.id} />
      </main>
    </div>
  );
}
