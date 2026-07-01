import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { UsersThree, GearSix } from "@phosphor-icons/react/dist/ssr";

export function AppHeader({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: "admin" | "member" };
}) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="sticky top-4 z-30 px-4">
      <header className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-btn pl-5 pr-2.5">
        <Link href="/" className="cursor-pointer">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-1">
          {user.role === "admin" && (
            <Link
              href="/admin/users"
              className="inline-flex h-9 items-center gap-1.5 rounded-btn px-3 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-[rgba(20,22,28,0.05)] hover:text-ink"
            >
              <UsersThree size={16} />
              Users
            </Link>
          )}
          <Link
            href="/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-btn px-3 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-[rgba(20,22,28,0.05)] hover:text-ink"
          >
            <GearSix size={16} />
            Settings
          </Link>
          <SignOutButton />
          <span
            className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white"
            title={user.email ?? undefined}
          >
            {initial}
          </span>
        </div>
      </header>
    </div>
  );
}
