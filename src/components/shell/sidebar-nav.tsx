"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Microphone,
  UsersThree,
  GearSix,
  type Icon,
} from "@phosphor-icons/react";

type Item = {
  href: string;
  label: string;
  icon: Icon;
  match: (p: string) => boolean;
};

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Overview",
    icon: SquaresFour,
    match: (p) => p === "/" || p.startsWith("/note") || p.startsWith("/project"),
  },
  { href: "/record", label: "Record", icon: Microphone, match: (p) => p.startsWith("/record") },
];

const ADMIN_ITEM: Item = {
  href: "/admin/users",
  label: "Users",
  icon: UsersThree,
  match: (p) => p.startsWith("/admin"),
};

const SETTINGS_ITEM: Item = {
  href: "/settings",
  label: "Settings",
  icon: GearSix,
  match: (p) => p.startsWith("/settings"),
};

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM, SETTINGS_ITEM] : [...ITEMS, SETTINGS_ITEM];

  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Primary">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center gap-2.5 rounded-btn px-2.5 text-[13.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
              active
                ? "border border-hairline bg-white text-ink shadow-[0_1px_2px_rgba(18,22,33,0.05)]"
                : "border border-transparent text-muted hover:bg-white/70 hover:text-ink"
            }`}
          >
            <Icon size={17} weight={active ? "fill" : "regular"} className={active ? "text-accent-deep" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
