import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { HeaderNav } from "@/components/nav/header-nav";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";
import { GearSix } from "@phosphor-icons/react/dist/ssr";

export function AppHeader({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: "admin" | "member" };
}) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";

  return (
    <>
      <div
        className="sticky z-30 px-3 sm:px-4"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <header className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-btn pl-4 pr-2 sm:pl-5 sm:pr-2.5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link href="/" className="shrink-0 cursor-pointer">
              <Wordmark />
            </Link>
            <HeaderNav isAdmin={isAdmin} />
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="hidden h-9 items-center gap-1.5 rounded-btn px-3 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-[rgba(20,22,28,0.05)] hover:text-ink md:inline-flex"
            >
              <GearSix size={16} />
              Settings
            </Link>
            <SignOutButton />
            <span
              className="ml-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white"
              title={user.email ?? undefined}
            >
              {initial}
            </span>
          </div>
        </header>
      </div>

      <MobileTabBar isAdmin={isAdmin} />
    </>
  );
}
