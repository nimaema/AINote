import Link from "next/link";
import { Wordmark, SignalMark } from "@/components/brand";
import { SidebarNav } from "./sidebar-nav";
import { MobileTabBar } from "@/components/nav/mobile-tab-bar";
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
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-hairline md:flex"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 shrink-0 items-center px-4">
          <Link href="/" className="cursor-pointer">
            <Wordmark />
          </Link>
        </div>

        <div className="px-3 pb-3 pt-1">
          <Link
            href="/record"
            className="flex h-9 items-center justify-center gap-1.5 rounded-btn bg-ink text-[13.5px] font-medium text-white shadow-[0_1px_2px_rgba(20,24,40,0.16)] transition-[transform,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-px active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} weight="bold" /> New capture
          </Link>
        </div>

        <SidebarNav isAdmin={isAdmin} />

        <div className="mt-auto flex items-center gap-2.5 border-t border-hairline p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12.5px] font-semibold text-white">
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
        className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-hairline bg-white/85 px-4 backdrop-blur-md md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/" className="inline-flex items-center gap-2 cursor-pointer">
          <SignalMark size={18} />
          <span className="font-display text-[15px] font-bold tracking-tight text-ink">
            GlaciaNav<span className="font-mono text-[12px] font-normal text-faint"> / notes</span>
          </span>
        </Link>
        <Link
          href="/settings"
          aria-label="Account"
          className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white"
        >
          {initial}
        </Link>
      </header>

      <div className="md:pl-60">{children}</div>

      <MobileTabBar isAdmin={isAdmin} />
    </div>
  );
}
