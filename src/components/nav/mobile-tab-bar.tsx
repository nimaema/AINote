"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Microphone, GearSix, UsersThree } from "@phosphor-icons/react";

// App-style fixed bottom navigation, shown only on small screens.
export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" || p.startsWith("/note") },
    { href: "/record", label: "Record", icon: Microphone, match: (p: string) => p.startsWith("/record") },
    ...(isAdmin
      ? [{ href: "/admin/users", label: "Users", icon: UsersThree, match: (p: string) => p.startsWith("/admin") }]
      : []),
    { href: "/settings", label: "Settings", icon: GearSix, match: (p: string) => p.startsWith("/settings") },
  ];

  return (
    <nav
      className="glass fixed inset-x-3 bottom-3 z-40 flex items-stretch justify-around rounded-panel px-1.5 py-1.5 md:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      {tabs.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-input py-1.5 text-[11px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
              active ? "text-accent-deep" : "text-muted"
            }`}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
