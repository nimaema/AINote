"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/record", label: "Record", match: (p: string) => p.startsWith("/record") },
];

// Desktop primary nav with active highlighting.
export function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...LINKS, { href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin") }]
    : LINKS;

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {links.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-btn px-3 py-1.5 text-[13.5px] font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
              active ? "bg-[rgba(20,22,28,0.06)] text-ink" : "text-muted hover:text-ink hover:bg-[rgba(20,22,28,0.04)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
