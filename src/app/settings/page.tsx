import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { AccountPanel } from "@/components/settings/account-panel";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell user={session.user}>
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-7">
        <div className="mb-5 border-b border-hairline px-1 pb-5">
          <p className="font-mono text-[11px] text-faint">Control panel</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.015em] text-ink">Account</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Manage how you sign in. These settings apply to your account only.
          </p>
        </div>

        <AccountPanel
          email={session.user.email ?? ""}
          role={session.user.role}
        />
      </main>
    </AppShell>
  );
}
