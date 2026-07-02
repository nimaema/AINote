"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type PasswordResult = { ok: boolean; error?: string };

const schema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "The new passwords don't match.",
  });

// Lets a signed-in user change their own password. Verifies the current
// password before setting a new one; never touches other accounts.
export async function changeOwnPassword(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<PasswordResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Please sign in again." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user?.passwordHash) {
    return { ok: false, error: "This account has no password set." };
  }

  const valid = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!valid) return { ok: false, error: "Your current password is incorrect." };

  if (await bcrypt.compare(parsed.data.next, user.passwordHash)) {
    return { ok: false, error: "Choose a password you haven't used here before." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return { ok: true };
}
