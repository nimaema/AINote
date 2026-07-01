"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react";

export function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setPending(false);

    if (res?.error) {
      setError("Those credentials don't match an active account.");
      return;
    }
    router.push(from || "/");
    router.refresh();
  }

  const field =
    "h-12 w-full rounded-input border border-hairline bg-white/70 px-4 " +
    "text-[15px] text-ink placeholder:text-faint " +
    "transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] " +
    "hover:border-hairline-strong focus:border-accent focus:outline-none " +
    "focus:shadow-[0_0_0_4px_var(--color-accent-wash)]";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-medium text-ink-soft">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@glacianav.com"
          className={field}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[13px] font-medium text-ink-soft">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-[13px] text-err">
          <WarningCircle size={16} weight="fill" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-[12.5px] text-faint">
        Accounts are provisioned by an administrator. Need access? Ask your admin.
      </p>
    </form>
  );
}
