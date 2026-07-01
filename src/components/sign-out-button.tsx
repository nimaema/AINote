"use client";

import { signOut } from "next-auth/react";
import { SignOut } from "@phosphor-icons/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/login" })}
      className="inline-flex h-9 items-center gap-1.5 rounded-btn px-3 text-[13px] text-muted transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-[rgba(20,22,28,0.05)] hover:text-ink cursor-pointer"
      aria-label="Sign out"
    >
      <SignOut size={16} />
      Sign out
    </button>
  );
}
