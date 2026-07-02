import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AccountPanel } from "@/components/settings/account-panel";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-2xl px-4 pb-28 md:pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
          Account
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Manage how you sign in. These settings apply to your account only.
        </p>

        <AccountPanel
          email={session.user.email ?? ""}
          role={session.user.role}
        />
      </main>
    </div>
  );
}
