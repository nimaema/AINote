"use client";

import { signOut } from "next-auth/react";
import { SignOut } from "@phosphor-icons/react";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <button
        onClick={() => signOut({ redirectTo: "/login" })}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-input text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift hover:text-ink cursor-pointer"
        aria-label="Sign out"
        title="Sign out"
      >
        <SignOut size={16} />
      </button>
    );
  }
  return (
    <button
      onClick={() => signOut({ redirectTo: "/login" })}
      className="inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-panel-lift hover:text-ink cursor-pointer"
      aria-label="Sign out"
    >
      <SignOut size={16} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
