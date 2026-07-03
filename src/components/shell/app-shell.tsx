import Link from "next/link";
import { Wordmark, SignalMark } from "@/components/brand";
import { SidebarNav } from "./sidebar-nav";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";
import { NotificationsBell } from "@/components/nav/notifications-bell";
import { SignOutButton } from "@/components/sign-out-button";
import { Plus } from "@phosphor-icons/react/dist/ssr";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  role: "admin" | "member";
};

// The application chrome: a fixed sidebar on desktop, a slim top bar plus the
// bottom tab bar on mobile. Pages render their own <main> as children.
export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-[100dvh]">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-hairline bg-bg-2 md:flex"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/" className="cursor-pointer">
            <Wordmark />
          </Link>
          <NotificationsBell align="right" />
        </div>

        <div className="px-4 pb-5 pt-1">
          <Link
            href="/record"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-accent text-[13.5px] font-semibold text-accent-ink shadow-[0_10px_24px_-14px_rgba(214,70,31,0.7)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:shadow-[0_14px_30px_-14px_rgba(214,70,31,0.85)] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} weight="bold" /> New capture
          </Link>
          <div className="mt-3 rounded-[14px] border border-hairline bg-bg px-3 py-2.5">
            <p className="font-mono text-[10.5px] text-faint">Station</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Local workspace</p>
          </div>
        </div>

        <SidebarNav isAdmin={isAdmin} />

        <div className="mt-auto flex items-center gap-2.5 border-t border-hairline bg-bg/35 p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[12.5px] font-semibold text-accent-ink">
            {initial}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-ink">{user.name ?? "Member"}</p>
            <p className="truncate text-[11.5px] text-faint">{user.email}</p>
          </div>
          <SignOutButton compact />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-hairline bg-bg-2/90 px-4 backdrop-blur-md md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/" className="inline-flex items-center gap-2 cursor-pointer">
          <SignalMark size={18} />
          <span className="font-display text-[15px] font-bold tracking-tight text-ink">
            GlaciaNav<span className="font-mono text-[12px] font-normal text-faint"> / notes</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsBell align="right" />
          <Link
            href="/settings"
            aria-label="Account"
            className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-ink"
          >
            {initial}
          </Link>
        </div>
      </header>

      <div className="md:pl-72">{children}</div>

      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}
